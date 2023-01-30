import initBrowser from "./src/CreateBrowser.js";
import puppeteer from "puppeteer-core";
import fs, { unlinkSync } from "fs";
import { exec, execSync } from "child_process";
import { PageError } from "./src/errors/PageErrors.js";
import { waitForDownload } from "./waitForDownload.js";
import { waitForAuthenticatorExists } from "./waitForAuthenticatorExists.js";
import mountHTML from "./src/Support/mountHTML.js";
import htmlToPdf from "./src/Support/htmlToPdf.js";
import { clearDownload } from "./clearDownloads.js";

export async function geraEvento({ config, clientes }) {
  let browser, page;
  let index = 0;
  try {
    ({ browser, page } = await initBrowser(puppeteer, config, false));
    let error1, elementHandle, frame, startJava;
    await page.goto("https://cav.receita.fazenda.gov.br/ecac/", {
      waitUntil: "networkidle2",
    });
    let certf = await page
      .click("#login-dados-certificado > p:nth-child(2) > input[type=image]", {
        clickCount: 2,
      })
      .catch((e) => "certificado salvo");
    if (certf !== "certificado salvo") {
      await page.waitForNetworkIdle();
      await page.waitForSelector("#cert-digital > a");
      await page.click("#cert-digital > a");
    }
    await page.waitForNetworkIdle();
    await page.click("#btn214 > a");
    await page.waitForNetworkIdle();
    await page.click(
      "#containerServicos214 > div:nth-child(8) > ul > li:nth-child(1) > a"
    );
    for (index; index < clientes.length; index++) {
      console.log(clientes[index].RAZAO);
      await page.waitForSelector("#btnPerfil");
      await page.click("#btnPerfil");
      await page
        .click("#formTitular > input.submit")
        .catch((e) => console.log("sem botao titular"));
      await page.waitForTimeout(2500);
      await page.waitForNetworkIdle();
      await page.click("#btnPerfil").catch((e) => "ja esta aberto");
      await page.type("#txtNIPapel2", clientes[index].CNPJ.toString());
      await page.click("#formPJ > input.submit");
      await page.waitForTimeout(5000);
      await page.waitForNetworkIdle();
      const dialog = await page
        .$eval(
          "body > div.ui-dialog.ui-widget.ui-widget-content.ui-corner-all.no-close.ui-resizable",
          (element) => element.style.display?.trim()
        )
        .catch((e) => "sem dialog");
      if (dialog === "block") {
        console.log("dialog aberto");
        await page.evaluate((item) => {
          document.querySelector(
            "body > div.ui-dialog.ui-widget.ui-widget-content.ui-corner-all.no-close.ui-resizable"
          ).style.display = "none";
          document.querySelector("body > div.ui-widget-overlay").style.display =
            "none";
        });
      }
      error1 = await page
        .$eval("#perfilAcesso > div.erro > p", (item) =>
          item.textContent.trim()
        )
        .catch((e) => "ATENÇÃO:");
      if (error1 != "ATENÇÃO:") {
        throw new PageError(error1);
      }
      await page.waitForNetworkIdle();
      await page.waitForTimeout(3000);
      elementHandle = await page.$("#frmApp");
      frame = await elementHandle.contentFrame();
      await frame.waitForSelector("#nav > li:nth-child(2) > a");
      await frame.click("#nav > li:nth-child(2) > a");
      await frame.waitForSelector(
        "#nav > li:nth-child(2) > ul > li:nth-child(9) > a"
      );
      await frame.click("#nav > li:nth-child(2) > ul > li:nth-child(9) > a");
      await frame.waitForSelector("#AnoPesquisa").catch((e) => "error");
      await frame.type("#AnoPesquisa", "2022");
      await frame.click(
        "#divBody > form:nth-child(3) > fieldset > div > div:nth-child(2) > input"
      );
      await page.waitForNetworkIdle();
      const tabelaEventos = await frame
        .$$("#tabelaEventos tr", (element) => element)
        .catch((e) => "sem tabela");
      let existePeriodoCadastrado = false;
      if (tabelaEventos !== "sem tabela" || tabelaEventos.length !== 0) {
        for (let y = 2; y <= tabelaEventos.length; y++) {
          const periodoApuracao = await frame.$eval(
            `#tabelaEventos tr:nth-child(${y}) td:nth-child(1)`,
            (element) => element.textContent.trim()
          );
          console.log(periodoApuracao);
          if (periodoApuracao === config.periodoApuracao) {
            console.log(
              "Periodo ja cadastrado para o CNPJ " +
                clientes[index].CNPJ.toString()
            );
            existePeriodoCadastrado = true;
            const protocolo = await frame.$eval(
              `#tabelaEventos tr:nth-child(${y}) td:nth-child(7)`,
              (element) => element.textContent.trim()
            );
            const html = await mountHTML("evento.html", [
              `${clientes[index].CNPJ.toString()} - ${clientes[index].RAZAO}`,
              `Protocolo de Fechamento: ${protocolo}`,
              config.periodoApuracao,
            ]);
            htmlToPdf(puppeteer, html, `${clientes[index].RAZAO}.pdf`, config);
            break;
          }
        }
      }
      if (existePeriodoCadastrado) {
        global.tentativas = 0;
        continue;
      }
      await frame.click(
        "#divBody > form:nth-child(4) > fieldset:nth-child(2) > a"
      );
      await frame.waitForSelector("#PeriodoApuracao");
      await frame.type("#PeriodoApuracao", config.periodoApuracao);
      await frame.type("#CpfResponsavel", config["contador"]["cpf"]);
      await frame.type("#NomeResponsavel", config["contador"]["nome"]);
      await frame.type("#TelefoneResponsavel", config["contador"]["telefone"]);
      await frame.type("#EmailResponsavel", config["contador"]["email"]);
      await frame.click("#concluir_enviar");
      await page.waitForNetworkIdle();
      clearDownload(config.pathDownload);
      await page.waitForTimeout(3000);
      const alert = await frame
        .$eval(
          "#divPrincipal > div.message.alert",
          (element) => element.style.display
        )
        .catch((e) => "sem alert");
      if (alert === "block") {
        const error = await frame.$eval(
          "#divPrincipal > div.message.alert",
          (element) => element.textContent.trim()
        );
        throw new PageError(error);
      }

      const alertMessageError = await frame
        .$eval("#mensagensErrosGeral", (element) => element.style.display)
        .catch((e) => "sem alert");
      if (alertMessageError === "block") {
        throw new Error("Erro a preencher as informações");
      }
      console.log("esperando baixar o arquivo java");
      await waitForDownload(config.pathDownload);
      startJava = fs
        .readdirSync(config.pathDownload)
        .filter((item) => item.slice(-4) == "jnlp")[0];
      console.log(startJava);
      exec(`javaws download\\${startJava}`, (err, stdout, strerr) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log(stdout);
      });
      console.log("esperando programa abrir");
      await waitForAuthenticatorExists(config);
      execSync(
        `"C:\\Program Files\\AutoHotkey\\AutoHotkey.exe" src\\Support\\clickCoord.ahk`
      );
      unlinkSync(`./download/${startJava}`);
      await frame.waitForTimeout(1000);
      await frame.waitForSelector(
        "#divBody > form > fieldset > span:nth-child(5)"
      );
      const protocolo = await frame.$eval(
        "#divBody > form > fieldset > span:nth-child(5)",
        (element) => element.textContent.trim()
      );
      const html = await mountHTML("evento.html", [
        `${clientes[index].CNPJ.toString()} - ${clientes[index].RAZAO}`,
        protocolo,
        config.periodoApuracao,
      ]);
      htmlToPdf(puppeteer, html, `${clientes[index].RAZAO}.pdf`, config);
      global.tentativas = 0;
    }

    await browser.close();
    return {
      status: true,
    };
  } catch (error) {
    console.log(error);
    //const client = await page?.target()?.createCDPSession();
    //await client?.send("Network.clearBrowserCookies");
    await page?.close();
    await browser.close();
    if (error instanceof puppeteer.errors.TimeoutError) {
      return {
        status: false,
        repeat: true,
        indice: index,
      };
    }

    if (error instanceof PageError) {
      return {
        status: false,
        repeat: false,
        error: error.message,
        indice: index,
      };
    }

    return {
      status: false,
      repeat: true,
      indice: index,
    };
  }
}
