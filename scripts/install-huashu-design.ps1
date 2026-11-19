# Instala Huashu Design en la carpeta de skills del proyecto.
# Requiere Git; no altera el despliegue de Vercel.
$ErrorActionPreference = "Stop"
$target = Join-Path (Get-Location) ".agents\skills\huashu-design"
$parent = Split-Path $target -Parent
New-Item -ItemType Directory -Path $parent -Force | Out-Null
if (Test-Path $target) {
  Write-Host "Huashu Design ya existe en $target. No se sobrescribe."
  exit 0
}
git clone --depth 1 https://github.com/alchaincyf/huashu-design.git $target
if ($LASTEXITCODE -ne 0) { throw "Error al descargar Huashu Design" }
Write-Host "Huashu Design instalado en $target"
Write-Host "Revisa SKILL.md y los scripts externos antes de ejecutarlos."
