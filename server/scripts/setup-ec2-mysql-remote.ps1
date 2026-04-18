# 在本机 PowerShell 执行：在 EC2 上安装 MariaDB、创建 shiting_erp 库、设置 root@localhost 密码
# 用法:
#   cd server\scripts
#   .\setup-ec2-mysql-remote.ps1
#   .\setup-ec2-mysql-remote.ps1 -Ec2Host "54.x.x.x" -KeyPath "F:\石亭\shiting-aws.pem" -MysqlRootPassword "你的密码"
param(
  [string]$KeyPath = "F:\石亭\shiting-aws.pem",
  [string]$Ec2User = "ec2-user",
  [string]$Ec2Host = "54.211.16.207",
  [string]$MysqlRootPassword = ""
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $KeyPath)) {
  Write-Error "找不到密钥: $KeyPath"
}
if (-not $MysqlRootPassword) {
  $sec = Read-Host "输入 MySQL root 密码（须与 server/.env 中 DATABASE_URL 一致）" -AsSecureString
  $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $MysqlRootPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}
$target = "${Ec2User}@${Ec2Host}"
$sshArgs = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new", $target)

Write-Host ">>> 安装并启动 MariaDB ..."
ssh @sshArgs "sudo dnf install -y mariadb105-server && sudo systemctl enable --now mariadb"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> 创建数据库 shiting_erp ..."
ssh @sshArgs "sudo mysql -e 'CREATE DATABASE IF NOT EXISTS shiting_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> 设置 root@localhost 密码 ..."
$pwEscaped = $MysqlRootPassword.Replace("'", "''")
$remoteSql = "ALTER USER 'root'@'localhost' IDENTIFIED BY '$pwEscaped'; FLUSH PRIVILEGES;"
ssh @sshArgs "sudo mysql -e `"$remoteSql`""
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "完成。请在 EC2 上进入项目 server 目录执行: npx prisma db push"
