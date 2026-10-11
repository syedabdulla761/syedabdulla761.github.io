# Builds résumé v15 from v14 (run tools/resume_v14.ps1 first if v14 is missing).
#   Syed_Abdulla_Resume_v15.docx      — India: classic centred header, no photo
#   Syed_Abdulla_Resume_v15_GCC.docx  — Middle East / GCC: photo-left header + relocation line
# Also exports the GCC version as the site PDF. Both must stay on 1 page (printed below).
$ErrorActionPreference = 'Stop'
$dl    = 'C:\Users\syed.abdulla\Downloads'
$repo  = 'C:\Users\syed.abdulla\repos\syed-portfolio'
$src   = "$dl\Syed_Abdulla_Resume_v14.docx"
$photo = "$repo\img\syed-round.png"

$w = New-Object -ComObject Word.Application
$w.Visible = $false
try {
  foreach ($variant in @('IN', 'GCC')) {
    $dst = if ($variant -eq 'GCC') { "$dl\Syed_Abdulla_Resume_v15_GCC.docx" } else { "$dl\Syed_Abdulla_Resume_v15.docx" }
    $d = $w.Documents.Open($src, $false, $true)
    $d.SaveAs2($dst, 16)

    function Swap($find, $repl) {
      $r = $d.Content; $f = $r.Find
      $f.ClearFormatting(); $f.Replacement.ClearFormatting()
      $ok = $f.Execute($find, $true, $false, $false, $false, $false, $true, 0, $false, $repl, 1)
      if (-not $ok) { "  !! not found: $find" }
    }
    function Style($text, $bold, $color) {  # re-apply emphasis after a replace flattened it
      $r = $d.Content; $f = $r.Find; $f.MatchCase = $true
      if ($f.Execute($text)) { $r.Font.Bold = $bold; if ($color -ne $null) { $r.Font.Color = $color } }
      else { "  !! style target not found: $text" }
    }
    # metric emphasis style used throughout the résumé (bold + accent colour)
    $m = $d.Content; $null = $m.Find.Execute('15+ modules'); $accent = $m.Font.Color

    # 1) Summary: lead with the strongest proof points
    Swap 'Software Engineer with 3+ years of experience specializing in high-performance React architectures and enterprise data visualization, now full-stack with Spring Boot.' 'Full-stack Software Engineer with 3+ years building Simba, insightsoftware''s enterprise embedded-analytics platform, across React/TypeScript front ends and Spring Boot services.'
    Swap 'Independently owns high-impact features end-to-end — from library migrations and UI unifications to WCAG compliance — while maintaining zero-spillover sprint delivery.' 'Owns the public Playground (playground.simba.com) end-to-end, led the AG-Grid v35 migration (−42% bundle) and has closed 305 Jira tickets with zero sprint spillover.'
    Style '3+ years' $true $null
    Style 'zero sprint spillover' $true $null

    # 2) AG-Grid bullet: same facts, ~1 line shorter
    Swap 'Led the enterprise-wide grid library upgrade across ' 'Led the grid upgrade across '
    Swap ' to completion; authored a comprehensive spike document covering ' ': authored the spike ('
    Swap ', migration strategy, and a phased ' ', '
    Swap ' roadmap, then migrated ' ' roadmap), migrated '
    Swap ', moving to AG-Grid''s modular v35 architecture; profiled the build and cut the grid bundle ' ' to the modular v35 architecture, and cut the grid bundle '
    Swap ' by registering only the 15 modules in use and enabling cross-chunk dead-code elimination.' ' by registering only the modules in use.'

    # 3) Folder Organization: one full-stack bullet instead of two
    Swap 'Folder Organization – Backend:' 'Folder Organization (Full-Stack):'
    Swap 'admin preview/execute migration, atomic sharing-driven moves.' 'admin preview/execute migration, atomic sharing-driven moves; plus the React Library tree, breadcrumbs and folder dialogs.'
    foreach ($p in $d.Paragraphs) { if ($p.Range.Text -like 'Folder Organization – UI:*') { $p.Range.Delete(); break } }

    # 3b) Precise verbs: the Playground is owned end-to-end (not solo-built from zero); folders were implemented, design was shared
    Swap 'Built the public Playground (React + Spring Boot) from the ground up, publicly deployed' 'Own the public Playground (React + Spring Boot) end-to-end, publicly deployed'
    Swap 'Designed per-user private folders' 'Implemented per-user private folders'

    # 4) Cut filler
    Swap ' Key contributor to the broader product unification initiative.' ''

    # 5) Release Maintenance: the whole line was accent-highlighted — keep emphasis on the two numbers only
    foreach ($p in $d.Paragraphs) {
      if ($p.Range.Text -like 'Release Maintenance:*') {
        $lbl = $d.Range($p.Range.Start, $p.Range.Start + 'Release Maintenance:'.Length)
        $body = $d.Range($lbl.End, $p.Range.End - 1)
        $plain = $d.Paragraphs | Where-Object { $_.Range.Text -like 'Hackathon Win:*' } | Select-Object -First 1
        $body.Font.Bold = 0; $body.Font.Color = $plain.Range.Characters.Last.Previous().Font.Color
        foreach ($t in @('305 Jira tickets', '89 backports')) {
          $r = $d.Range($body.Start, $body.End); if ($r.Find.Execute($t)) { $r.Font.Bold = 1; $r.Font.Color = $accent }
        }
        break
      }
    }

    # 6) Availability line (both variants; GCC adds nationality / passport / relocation)
    $langs = $null; foreach ($p in $d.Paragraphs) { if ($p.Range.Text -like 'Languages:*') { $langs = $p } }
    $text = if ($variant -eq 'GCC') { 'Availability: Indian national (valid passport)  |  Notice period: 60 days  |  Ready to relocate on an employer-sponsored work visa' } else { 'Availability: Notice period: 60 days  |  Open to Bengaluru, other Indian cities and remote roles' }
    $endPos = $langs.Range.End - 1
    $d.Range($endPos, $endPos).InsertAfter([string][char]13 + $text)
    $start = $endPos + 1
    $av = $d.Range($start, $start + $text.Length)
    $av.Font.Color = $langs.Range.Characters.First.Font.Color
    $d.Range($start, $start + 'Availability:'.Length).Font.Bold = 1

    if ($variant -eq 'GCC') {
      # Photo-left header: name / title / contact sit to the right of a round headshot
      Swap 'Software Engineer  |  Full-Stack  |  React · TypeScript · Java · Spring Boot' 'Full-Stack Software Engineer  |  React · TypeScript · Java · Spring Boot  |  Open to GCC relocation'
      Swap '+91 88676 18049' '+91 88676 18049 (WhatsApp)'
      $size = 66; $gap = 12
      $h = $d.Range($d.Paragraphs(1).Range.Start, $d.Paragraphs(3).Range.End)
      $h.ParagraphFormat.Alignment = 0
      $h.ParagraphFormat.LeftIndent = $size + $gap
      $pic = $d.Shapes.AddPicture($photo, $false, $true, 0, 0, $size, $size, $d.Paragraphs(1).Range)
      $pic.WrapFormat.Type = 3                     # in front of text (indent keeps the text clear)
      $pic.RelativeHorizontalPosition = 0          # margin
      $pic.RelativeVerticalPosition = 0            # margin
      $pic.Left = 0; $pic.Top = 0
      $pic.LockAspectRatio = -1
      $nextTop = $d.Paragraphs(4).Range.Information(6)
      $picBottom = $d.PageSetup.TopMargin + $size
      "  header: photo bottom {0}pt, next section starts {1}pt" -f $picBottom, $nextTop
      if ($picBottom -gt $nextTop - 4) {             # give the header block room for the photo (space freed by the edits above)
        $need = [single]($picBottom - $nextTop + 6)
        $p3 = $d.Paragraphs(3)
        $p3.SpaceAfter = [single]($p3.SpaceAfter + $need)
        "  added {0}pt below the header; next section now at {1}pt" -f $need, $d.Paragraphs(4).Range.Information(6)
      }
    }

    "{0}: pages = {1}, last line at {2}pt" -f $variant, $d.ComputeStatistics(2), $d.Paragraphs($d.Paragraphs.Count).Range.Information(6)
    $d.Save()
    if ($variant -eq 'GCC') { $d.SaveAs2("$repo\Syed_Abdulla_Resume.pdf", 17); $d.SaveAs2("$repo\Syed_Abdulla_Resume.docx", 16) }
    else { $d.SaveAs2("$dl\Syed_Abdulla_Resume_v15.pdf", 17) }
    $d.Close($false)
  }
} finally { $w.Quit() }
"done"
