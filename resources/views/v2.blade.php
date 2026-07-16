<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>V2 – BACOVET</title>
    <style>
        html { background-color: oklch(0.145 0 0); }
    </style>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/v2-main.tsx'])
</head>
<body class="font-sans antialiased">
    <div id="v2-app"></div>
</body>
</html>
