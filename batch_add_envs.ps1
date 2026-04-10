$keys = Get-Content new_keys_list.txt
for ($i = 1; $i -le $keys.Count; $i++) {
    $keyName = "GEMINI_API_KEY$i"
    $keyValue = $keys[$i-1].Trim()
    if ($keyValue -ne "") {
        Write-Output "[$i/100] Adding $keyName ..."
        # 使用 --value 参数直接传递值，并使�?--yes 跳过交互
        npx vercel env add $keyName production --value $keyValue --yes
    }
}
Write-Output "Batch upload completed!"
