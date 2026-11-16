; Windows installer for the PlutonyX desktop edition (Inno Setup 6).
; Build the game first (BuildPipeline.BuildWin -> Build\win\PlutonyX\), then from desktop\:
;   "D:\Tools\InnoSetup\ISCC.exe" tools\installer.iss
; Output: Build\release\PlutonyX-Setup-v1.0.exe
; Installs per user (no admin prompt), adds Start menu + optional desktop shortcut, and an uninstaller.

#define AppName "PlutonyX - Junior Astronaut Mission Trainer"
#define AppVersion "1.0"

[Setup]
AppId={{7E3C5B2A-9D41-4C7E-B8A2-5F1D3C6E9A10}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Team PlutonyX
DefaultDirName={localappdata}\Programs\PlutonyX
DefaultGroupName=PlutonyX
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\Build\release
OutputBaseFilename=PlutonyX-Setup-v{#AppVersion}
UninstallDisplayIcon={app}\PlutonyX.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"

[Files]
Source: "..\Build\win\PlutonyX\*"; DestDir: "{app}"; Excludes: "*_BackUpThisFolder_ButDontShipItWithYourGame\*,*.pdb"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\PlutonyX"; Filename: "{app}\PlutonyX.exe"
Name: "{group}\Uninstall PlutonyX"; Filename: "{uninstallexe}"
Name: "{userdesktop}\PlutonyX"; Filename: "{app}\PlutonyX.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\PlutonyX.exe"; Description: "Play PlutonyX now"; Flags: nowait postinstall skipifsilent
