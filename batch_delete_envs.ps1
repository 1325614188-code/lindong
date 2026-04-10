Get-Content keys_to_delete_utf8.txt | ForEach-Object {
    $key = $_.Trim()
    if ($key -ne "") {
        Write-Output "Deleting $key ..."
        npx -y vercel env rm -y $key
    }
}
