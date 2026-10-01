$ErrorActionPreference = 'Stop'
$src = 'C:\Users\syed.abdulla\Downloads\Syed_Abdulla_Resume_v13.docx'
$dst = 'C:\Users\syed.abdulla\Downloads\Syed_Abdulla_Resume_v14.docx'
$pdf = 'C:\Users\syed.abdulla\repos\syed-portfolio\Syed_Abdulla_Resume.pdf'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
try {
  $d = $w.Documents.Open($src, $false, $true)
  $d.SaveAs2($dst, 16)
  $before = $d.ComputeStatistics(2)

  function Swap($find, $repl) {
    $r = $d.Content
    $f = $r.Find
    $f.ClearFormatting(); $f.Replacement.ClearFormatting()
    $ok = $f.Execute($find, $true, $false, $false, $false, $false, $true, 0, $false, $repl, 1)
    "{0}  <=  {1}" -f $ok, $find
  }

  # Playground: new public URL and accurate reach
  Swap 'deployed at playground.logi-symphony.com, now used by 100+ enterprise customers for product exploration.' 'publicly deployed and marketed worldwide at playground.simba.com as the product sandbox for insightsoftware''s thousands of client companies.'
  Swap 'Built the customer-facing Playground tool (React + Spring Boot) from ground up,' 'Built the public Playground (React + Spring Boot) from the ground up,'
  Swap 'playground.logi-symphony.com' 'playground.simba.com'
  # Product renamed Logi Symphony -> Simba (Sept 2026)
  Swap 'Logi Composer (Logi Symphony BI Platform)' 'Logi Composer (Simba BI Platform, formerly Logi Symphony)'
  Swap 'Symphony Unification & Homepage Revamp:' 'Platform Unification & Homepage Revamp:'
  # Jira-verified delivery numbers
  Swap '90+ bugs fixed and 89 backports across 11 supported releases since 2023' '305 Jira tickets closed since 2023 (95 bugs, 4 technical spikes) and 89 backports across 11 supported releases'
  foreach ($h in $d.Hyperlinks) { if ($h.Address -like '*logi-symphony*') { $h.Address = 'https://playground.simba.com/'; "hyperlink updated" } }

  # Header: add LinkedIn + Portfolio after the email link (outside its field), styled like the email
  $mail = $null; foreach ($h in $d.Hyperlinks) { if ($h.Address -like 'mailto:*') { $mail = $h } }
  $para = $mail.Range.Paragraphs(1).Range
  $pos = $para.End - 1
  $d.Range($pos, $pos).InsertAfter('  |  LinkedIn  |  Portfolio')
  $new = $d.Range($pos, $pos + 27)
  $sep = $d.Range($para.Start, $para.Start + 1)
  $new.Font.Underline = 0; $new.Font.Color = $sep.Font.Color
  foreach ($pair in @(@('LinkedIn', 'https://www.linkedin.com/in/syed-abdulla-6467311b6/'), @('Portfolio', 'https://syedabdulla761.github.io/'))) {
    $rr = $d.Range($pos, $d.Content.End); $ff = $rr.Find; $ff.MatchCase = $true; $ff.MatchWholeWord = $true
    if ($ff.Execute($pair[0])) {
      $hl = $d.Hyperlinks.Add($rr, $pair[1])
      $hl.Range.Font.Color = $mail.Range.Font.Color; $hl.Range.Font.Underline = $mail.Range.Font.Underline
      "linked [" + $hl.TextToDisplay + "] -> " + $pair[1]
    }
  }

  $after = $d.ComputeStatistics(2)
  "pages before: $before  after: $after"
  $d.Save()
  $d.SaveAs2($pdf, 17)
  $d.Close($false)
} finally { $w.Quit() }
"done"
