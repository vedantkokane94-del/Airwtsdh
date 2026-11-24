$tStorage = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$tPdf = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$tPdfOptions = [Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime]
$tStream = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$tMode = [Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime]

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$extClass = [System.WindowsRuntimeSystemExtensions]
$methods = $extClass.GetMethods()

function Run-AsyncOp($asyncOp) {
    $asTask = ($methods | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 })[0]
    $resType = $asyncOp.GetType().GetGenericArguments()[0]
    $m = $asTask.MakeGenericMethod($resType)
    $t = $m.Invoke($null, @($asyncOp))
    $t.Wait(-1) | Out-Null
    return $t.Result
}

function Run-AsyncAction($asyncAction) {
    $asTask = ($methods | Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 })[0]
    $t = $asTask.Invoke($null, @($asyncAction))
    $t.Wait(-1) | Out-Null
}

$pdfPath = "C:\Users\MCL\.gemini\antigravity\brain\444fe2ef-0074-4a25-b0fb-ec62eb6dec44\.user_uploaded\media_1795223080442_d3a12d8f.pdf"
$outputPath = "c:\Users\MCL\Downloads\ai quiz\assets\certificate-template.png"

$file = Run-AsyncOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath))
$pdf = Run-AsyncOp ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file))
$page = $pdf.GetPage(0)

# Create output file
if (-not (Test-Path $outputPath)) {
    [System.IO.File]::WriteAllBytes($outputPath, [byte[]]@())
}
$outFile = Run-AsyncOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($outputPath))
$stream = Run-AsyncOp ($outFile.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite))

$renderOpts = [Windows.Data.Pdf.PdfPageRenderOptions]::new()
$renderOpts.DestinationWidth = 2400

$renderAction = $page.RenderToStreamAsync($stream, $renderOpts)
Run-AsyncAction $renderAction

$flushAction = $stream.FlushAsync()
Run-AsyncAction $flushAction

$stream.Dispose()
Write-Host "Success! Rendered certificate image size: $( (Get-Item $outputPath).Length ) bytes"
