$xmlPath = "d:\research-agent\temp_docx_extract\word\document.xml"
$doc = [xml](Get-Content $xmlPath -Raw)
$nsMgr = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$nsMgr.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$paragraphs = $doc.SelectNodes("//w:p", $nsMgr)
foreach ($p in $paragraphs) {
    $t = $p.InnerText
    if ($t.Trim() -ne "") {
        Write-Output $t
    }
}
