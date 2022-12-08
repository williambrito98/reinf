SetTitleMatchMode, RegEx
if WinExist("ahk_class SunAwtDialog")
    WinActivate
    Click, 390 250 left
    WinWait, Assinadoc.*
    WinActivate, Assinadoc.*
    Click, 390 355 left
    Sleep, 2000
    WinActivate, Assinadoc.*
    Click, 185 110 left
    return
if WinExist("ahk_class SunAwtFrame")
    WinActivate, Assinadoc.*
    Click, 390 355 left
    Sleep, 2000
    WinActivate, Assinadoc.*
    Click, 185 110 left
    return