<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Professional CV - {{FULL_NAME}}</title>
  <style>
    /* ============================================
       RESET & BASE
    ============================================ */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      background: #eef2f6;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 40px;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      display: flex;
      flex-direction: row;
    }

    /* ============================================
       SIDEBAR
    ============================================ */
    .sidebar {
      width: 30%;
      background: #10284a;
      color: #c8d0d8;
      padding: 40px 28px 35px;
      flex-shrink: 0;
    }

    .sidebar .photo {
      width: 145px;
      height: 145px;
      border-radius: 50%;
      background: #1a2a3e;
      margin: 0 auto 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 5px solid #ffffff;
      box-shadow: 0 0 0 4px #0d2445;
    }

    .sidebar .photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .sidebar .photo .initials {
      font-size: 52px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 1px;
    }

    .sidebar h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #ffffff;
      font-weight: 600;
      margin: 28px 0 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 10px;
    }

    .sidebar h2:first-of-type {
      margin-top: 0;
    }

    .sidebar .contact-item {
      font-size: 12px;
      line-height: 1.8;
      color: #c8d0d8;
      margin-bottom: 4px;
    }

    .sidebar .contact-item strong {
      color: #ffffff;
      font-weight: 500;
      display: inline-block;
      min-width: 70px;
    }

    .sidebar .highlight-list {
      list-style: none;
      padding: 0;
    }

    .sidebar .highlight-list li {
      font-size: 12px;
      line-height: 1.8;
      color: #c8d0d8;
      padding: 3px 0 3px 18px;
      position: relative;
    }

    .sidebar .highlight-list li::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #ffffff;
      font-weight: 700;
    }

    .sidebar .languages {
      margin-top: 4px;
    }

    .sidebar .languages .lang-item {
      font-size: 12px;
      line-height: 1.8;
      color: #c8d0d8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sidebar .languages .lang-item .lang-name {
      color: #ffffff;
      font-weight: 500;
    }

    .sidebar .languages .lang-item .lang-dots {
      color: #4a5a6a;
      letter-spacing: 1px;
      flex: 1;
      margin: 0 8px;
      text-align: center;
      font-size: 10px;
    }

    .sidebar .languages .lang-item .lang-level {
      color: #8a9aaa;
      font-size: 11px;
    }

    .sidebar .additional-info .info-item {
      font-size: 12px;
      line-height: 1.8;
      color: #c8d0d8;
    }

    .sidebar .additional-info .info-item strong {
      color: #ffffff;
      font-weight: 500;
      display: inline-block;
      min-width: 90px;
    }

    .sidebar .additional-info .info-item .status-available {
      color: #ffffff;
    }

    .sidebar .additional-info .info-item .status-not-available {
      color: #c97d2d;
    }

    /* ============================================
       MAIN CONTENT
    ============================================ */
    .main {
      width: 70%;
      padding: 40px 45px 35px 40px;
      flex-grow: 1;
    }

    .main .header-block {
      margin-bottom: 22px;
    }

    .main .header-block .name {
      font-size: 42px;
      line-height: 44px;
      font-weight: 900;
      color: #0a1a2e;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .main .header-block .title {
      font-size: 18px;
      color: #6d7077;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 4px;
    }

    .main .header-block .tagline {
      max-width: 95%;
      line-height: 1.5;
      font-size: 13px;
      color: #4e5560;
      margin-top: 6px;
    }

    .main h2 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #0a1a2e;
      font-weight: 700;
      border-bottom: 1px solid #10284a;
      padding-bottom: 8px;
      margin-top: 26px;
      margin-bottom: 14px;
    }

    .main h2:first-of-type {
      margin-top: 0;
    }

    .main .competencies {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 4px;
    }

    .main .competencies span {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 10px;
      background: #f5f6f8;
      color: #2b2b2b;
    }

    .main .experience-item {
      margin-bottom: 14px;
      padding-left: 18px;
      border-left: 2px solid #10284a;
      position: relative;
    }

    .main .experience-item::before {
      content: "";
      position: absolute;
      left: -5px;
      top: 6px;
      width: 8px;
      height: 8px;
      background: #10284a;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 0 0 2px #10284a;
    }

    .main .experience-item:last-child {
      margin-bottom: 0;
    }

    .main .experience-item .exp-title {
      font-size: 16px;
      font-weight: 800;
      color: #0a1a2e;
    }

    .main .experience-item .exp-company {
      font-size: 14px;
      font-weight: 600;
      color: #666666;
      font-style: italic;
    }

    .main .experience-item .exp-description {
      font-size: 13px;
      color: #3a3a4a;
      line-height: 1.45;
      margin-top: 4px;
      padding-left: 4px;
    }

    .main .experience-item .exp-description ul {
      list-style: none;
      padding: 0;
      margin: 4px 0 0;
    }

    .main .experience-item .exp-description ul li {
      padding: 2px 0 2px 18px;
      position: relative;
      font-size: 13px;
      line-height: 1.45;
    }

    .main .experience-item .exp-description ul li::before {
      content: "—";
      position: absolute;
      left: 0;
      color: #10284a;
    }

    .main .education-item {
      margin-bottom: 10px;
    }

    .main .education-item:last-child {
      margin-bottom: 0;
    }

    .main .education-item .edu-degree {
      font-size: 14px;
      font-weight: 700;
      color: #0a1a2e;
    }

    .main .education-item .edu-description {
      font-size: 12px;
      color: #607080;
      line-height: 1.5;
      margin-top: 2px;
    }

    .main .skills-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 24px;
    }

    .main .skill-bar {
      margin-bottom: 6px;
    }

    .main .skill-bar .skill-label {
      font-size: 12px;
      font-weight: 600;
      color: #0a1a2e;
      display: inline-block;
      min-width: 110px;
    }

    .main .skill-bar .skill-track {
      display: inline-block;
      width: 65%;
      height: 8px;
      background: #eef2f6;
      border-radius: 4px;
      overflow: hidden;
      vertical-align: middle;
      margin-left: 4px;
    }

    .main .skill-bar .skill-track .skill-fill {
      height: 100%;
      background: #10284a;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .main .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      font-size: 12px;
      color: #2b2b2b;
      line-height: 1.8;
    }

    .main .info-grid .info-item {
      padding: 4px 0;
      border-bottom: 1px solid #f0f2f4;
    }

    .main .info-grid .info-item:nth-last-child(1),
    .main .info-grid .info-item:nth-last-child(2) {
      border-bottom: none;
    }

    .main .info-grid .info-item strong {
      color: #0a1a2e;
      font-weight: 600;
      display: inline-block;
      min-width: 100px;
    }

    .main .info-grid .info-item .status-available {
      color: #2d7d46;
      font-weight: 600;
    }

    .main .info-grid .info-item .status-not-available {
      color: #c97d2d;
      font-weight: 600;
    }

    .main .personal-statement {
      font-size: 12.5px;
      color: #3a3a4a;
      line-height: 1.7;
      margin-top: 4px;
    }

    /* ============================================
       FOOTER - Mejorado
    ============================================ */
    .footer {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1px solid #eef0f2;
      text-align: center;
      font-size: 9px;
      color: #B5BDC7;
      line-height: 1.8;
      letter-spacing: 0.5px;
    }

    /* ============================================
       RESPONSIVE
    ============================================ */
    @media screen and (max-width: 800px) {
      body {
        padding: 15px;
      }

      .page {
        border-radius: 8px;
        width: 100%;
        min-height: auto;
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        padding: 30px 25px;
      }

      .sidebar .photo {
        width: 120px;
        height: 120px;
      }

      .sidebar .photo .initials {
        font-size: 40px;
      }

      .main {
        width: 100%;
        padding: 30px 25px;
      }

      .main .header-block .name {
        font-size: 34px;
        line-height: 36px;
      }

      .main .header-block .title {
        font-size: 16px;
      }

      .main .info-grid {
        grid-template-columns: 1fr;
        gap: 2px;
      }

      .main .info-grid .info-item {
        border-bottom: 1px solid #f0f2f4;
      }

      .main .info-grid .info-item:nth-last-child(1) {
        border-bottom: none;
      }

      .main .skills-container {
        grid-template-columns: 1fr;
      }

      .main .skill-bar .skill-track {
        width: 50%;
      }

      .sidebar .languages .lang-item .lang-dots {
        display: none;
      }
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }

      .page {
        border-radius: 0;
        box-shadow: none;
        width: 100%;
        min-height: 100vh;
      }

      .sidebar {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .main .competencies span {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .main .skill-bar .skill-track .skill-fill {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .main .experience-item::before {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>

<div class="page">

  <!-- ============================================
  SIDEBAR
  ============================================ -->
  <aside class="sidebar">

    <!-- PHOTO -->
    <div class="photo">
      {{PHOTO_HTML}}
    </div>

    <!-- CONTACT -->
    <h2>CONTACT</h2>
    <div class="contact-item">{{WHATSAPP}}</div>
    <div class="contact-item">{{EMAIL}}</div>
    <div class="contact-item">{{LOCATION}}</div>

    <!-- LANGUAGES -->
    <h2>LANGUAGES</h2>
    <div class="languages">
      {{LANGUAGES}}
    </div>

    <!-- KEY STRENGTHS -->
    <h2>KEY STRENGTHS</h2>
    <ul class="highlight-list">
      {{KEY_STRENGTHS}}
    </ul>

    <!-- ADDITIONAL INFO -->
    <h2>ADDITIONAL INFO</h2>
    <div class="additional-info">
      <div class="info-item"><strong>Passport:</strong> Available</div>
      <div class="info-item"><strong>Driving Licence:</strong> {{DRIVER_LICENSE}}</div>
      <div class="info-item"><strong>Availability:</strong> Immediate</div>
      <div class="info-item"><strong>Willing to relocate:</strong> Available to relocate</div>
    </div>

  </aside>

  <!-- ============================================
  MAIN CONTENT
  ============================================ -->
  <main class="main">

    <!-- HEADER -->
    <div class="header-block">
      <div class="name">{{FULL_NAME}}</div>
      <div class="title">{{JOB_TITLE}}</div>
      <div class="tagline">{{TAGLINE}}</div>
    </div>

    <!-- CORE COMPETENCIES -->
    <h2>CORE COMPETENCIES</h2>
    <div class="competencies">
      {{CORE_COMPETENCIES}}
    </div>

    <!-- EXPERIENCE -->
    <h2>EXPERIENCE</h2>
    {{EXPERIENCE_LIST}}

    <!-- EDUCATION -->
    <h2>EDUCATION</h2>
    {{EDUCATION_LIST}}

    <!-- PROFESSIONAL SKILLS -->
    <h2>PROFESSIONAL SKILLS</h2>
    <div class="skills-container">
      {{PROFESSIONAL_SKILLS}}
    </div>

    <!-- ADDITIONAL INFORMATION -->
    <h2>ADDITIONAL INFORMATION</h2>
    <div class="info-grid">
      <div class="info-item"><strong>Passport</strong> Available</div>
      <div class="info-item"><strong>Driving Licence</strong> {{DRIVER_LICENSE}}</div>
      <div class="info-item"><strong>Availability</strong> Immediate</div>
      <div class="info-item"><strong>Relocation</strong> Available to relocate</div>
    </div>

    <!-- PERSONAL STATEMENT -->
    <h2>PERSONAL STATEMENT</h2>
    <p class="personal-statement">{{PERSONAL_STATEMENT}}</p>

    <!-- FOOTER - Mejorado -->
    <div class="footer">
      Professional Curriculum Vitae • Generated for Employment Purposes
    </div>

  </main>

</div>

</body>
</html>
