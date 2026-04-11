for ($i = 1; $i -le 100; $i++) {
    $key = "GEMINI_API_KEY$i"
    Write-Host "DELETING: $key ..."
    npx -y vercel env rm -y $key
}
