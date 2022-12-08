import initBrowser from './src/CreateBrowser.js';
import puppeteer from 'puppeteer-core';
import fs, { unlinkSync } from 'fs';
import { exec, execSync } from 'child_process';
import { waitForAuthenticatorExists } from './waitForAuthenticatorExists.js';
import { waitForDownload } from './waitForDownload.js';
import mountHTML from './src/Support/mountHTML.js';
import htmlToPdf from './src/Support/htmlToPdf.js';
import { PageError } from './src/errors/PageErrors.js';

export async function main({ config, clientes }) {
    let browser, page;
    let index;
    try {
        ({ browser, page } = await initBrowser(puppeteer, config, false));
        let elementHandle, frame, startJava;
        await page.goto('https://cav.receita.fazenda.gov.br/ecac/', { waitUntil: 'networkidle2' });
        let certf = await page.click('#login-dados-certificado > p:nth-child(2) > input[type=image]', { clickCount: 2 }).catch(e => 'certificado salvo');
        if (certf !== 'certificado salvo') {
            await page.waitForNetworkIdle()
            await page.waitForSelector('#cert-digital > a')
            await page.click('#cert-digital > a');
        }
        await page.waitForNetworkIdle()
        await page.click('#btn214 > a');
        await page.waitForNetworkIdle()
        await page.click('#containerServicos214 > div:nth-child(9) > ul > li:nth-child(1) > a')
        for (index = 0; index < clientes.length; index++) {
            console.log(clientes[index].razao)
            await page.waitForSelector('#btnPerfil');
            await page.click('#btnPerfil');
            await page.click('#formTitular > input.submit').catch(e => console.log('sem botao titular'))
            await page.waitForTimeout(2500);
            await page.click('#btnPerfil').catch(e => 'ja esta aberto');
            await page.type('#txtNIPapel2', clientes[index].cnpj);
            await page.click('#formPJ > input.submit');
            await page.waitForTimeout(5000);
            await page.waitForNetworkIdle()
            const dialog = await page.$eval('body > div.ui-dialog.ui-widget.ui-widget-content.ui-corner-all.no-close.ui-resizable', element => element.style.display?.trim()).catch(e => 'sem dialog')
            if (dialog === 'block') {
                console.log('dialog aberto')
                await page.evaluate(item => {
                    document.querySelector('body > div.ui-dialog.ui-widget.ui-widget-content.ui-corner-all.no-close.ui-resizable').style.display = 'none'
                    document.querySelector('body > div.ui-widget-overlay').style.display = 'none'
                })
            }
            let error1 = await page.$eval('#perfilAcesso > div.erro > p', item => item.textContent.trim()).catch(e => 'ATENÇÃO:')
            if (error1 != "ATENÇÃO:") {
                throw new PageError(error1)
            }
            await page.waitForNetworkIdle()
            await page.waitForTimeout(5000);
            elementHandle = await page.$('#frmApp');
            frame = await elementHandle.contentFrame();
            await frame.click('#nav > li:nth-child(1) > a')
            await frame.waitForSelector('#nav > li:nth-child(1) > ul > li:nth-child(1) > a')
            await frame.click('#nav > li:nth-child(1) > ul > li:nth-child(1) > a');
            await frame.waitForSelector('#InicioPeriodoValidade', { timeout: 10000 }).catch(e => 'error');
            await page.waitForNetworkIdle()
            const tabelaCadastro = await frame.$$eval('#divBody > form > table tr', element => element.length).catch(e => 'sem tabela')
            console.log(tabelaCadastro)
            let existeCadastro = false
            if (tabelaCadastro !== 'sem tabela') {
                for (let y = 2; y <= tabelaCadastro; y++) {
                    const inicioValidade = await frame.$eval(`#divBody > form > table tr:nth-child(${y}) > td`, element => element.textContent.trim())
                    if (inicioValidade === config.periodoApuracao) {
                        console.log('ja cadastrado')
                        const recibo = await frame.$eval(`#divBody > form > table tr:nth-child(${y}) td:nth-child(3)`, element => element.textContent.trim())
                        if (!recibo) {
                            throw new Error('recibo não encontrado')
                        }
                        const html = await mountHTML('cadastro.html', [
                            `${clientes[index].cnpj.toString()} - ${clientes[index].razao}`,
                            config.periodoApuracao,
                            recibo
                        ])
                        htmlToPdf(puppeteer, html, `${clientes[index].razao}.pdf`, config)
                        global.tentativas = 0;
                        existeCadastro = true
                        break
                    }

                }
            }
            if (existeCadastro) {
                global.tentativas = 0;
                continue
            }
            await frame.type('#InicioPeriodoValidade', config.periodoApuracao)
            await frame.select('#ClassificacaoTributaria', '99')
            await frame.select('#IndSitPJ', '0');
            await frame.evaluate(() => {
                document.querySelector("#radioIndEscrituracao[value='0']").click();
                document.querySelector("#radioIndDesoneracao[value='0']").click();
                document.querySelector("#radioIndAcordoIsenMulta[value='0']").click();
            })
            await frame.type('#CpfContato', clientes[index]['cpf'].toString())
            await frame.type('#NomeContato', clientes[index]['nome_responsavel'])
            await frame.type('#FoneFixo', config['infoContato'].telefone.toString())
            await frame.type('#Email', config['infoContato'].email);
            await frame.evaluate(() => document.querySelector('#fieldsetListagemSoftHouse > input').click())
            await frame.waitForTimeout(2500);
            await frame.type('#ItemEdicaoSoftHouse_CnpjSoftHouse', config['software']['cnpj']);
            await frame.type('#ItemEdicaoSoftHouse_NomeRazaoSocial', config['software']['razao'])
            await frame.type('#ItemEdicaoSoftHouse_NomeContatoSoftHouse', config['software']['nome_contato'])
            await frame.type('#ItemEdicaoSoftHouse_Telefone', config['software']['telefone'])
            await frame.type('#ItemEdicaoSoftHouse_EmailSoftHouse', config['software']['email']);
            await frame.evaluate(() => document.querySelector('#fieldsetInclusaoSoftHouse > fieldset > input:nth-child(8)').click())
            await frame.waitForTimeout(2500);
            await frame.evaluate(() => document.querySelector('#concluir_enviar').click())
            await page.waitForNetworkIdle()
            await page.waitForTimeout(3000)
            const alert = await frame.$eval('#divPrincipal > div.message.alert', element => element.style.display).catch(e => 'sem alert')
            if (alert === 'block') {
                const error = await frame.$eval('#divPrincipal > div.message.alert', element => element.textContent.trim())
                throw new PageError(error)
            }
            console.log('esperando baixar o arquivo java')
            await waitForDownload(config.pathDownload)
            startJava = ((fs.readdirSync(config.pathDownload)).filter(item => item.slice(-4) == 'jnlp'))[0]
            console.log(startJava)
            exec(`javaws download\\${startJava}`, (err, stdout, strerr) => {
                if (err) {
                    console.log(err);
                    return
                }
                console.log(stdout);
            })
            console.log('esperando programa abrir')
            await waitForAuthenticatorExists(config)
            execSync(`"C:\\Program Files\\AutoHotkey\\AutoHotkey.exe" src\\Support\\clickCoord.ahk`)
            unlinkSync(`./download/${startJava}`)
            await frame.waitForTimeout(3000);
            await frame.waitForSelector('#divPrincipal > div.message.success', { visible: true })
            const recibo = await frame.$eval('#divPrincipal > div.message.success', element => element.textContent.trim().replace(' Evento recebido com sucesso.', '').split('Recibo')[1].trim().replace(':', '').trim()).catch(e => '')
            if (!recibo) {
                throw new Error('recibo não encontrado')
            }
            const html = await mountHTML('cadastro.html', [
                `${clientes[index].cnpj.toString()} - ${clientes[index].razao}`,
                config.periodoApuracao,
                recibo
            ])
            htmlToPdf(puppeteer, html, `${clientes[index].razao}.pdf`, config)
            global.tentativas = 0;

        }
        await browser.close();
        return {
            status: true
        }
    } catch (error) {
        console.log(error)
        await browser.close()

        if (error instanceof puppeteer.errors.TimeoutError) {
            return {
                status: false,
                repeat: true,
                indice: index
            }
        }

        if (error instanceof PageError) {
            return {
                status: false,
                repeat: false,
                error: error.message,
                indice: index
            }
        }

        return {
            status: false,
            repeat: true,
            indice: index
        }


    }

}
