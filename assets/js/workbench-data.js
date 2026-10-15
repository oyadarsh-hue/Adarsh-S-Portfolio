/* Curated evidence from the linked portfolio case studies; no inferred proficiency. */
((global) => {
  'use strict';
  const projects = [
    {id:'quietnote', name:'QuietNote', scope:'Deployed assessment POC', stack:'React, TypeScript, PostgreSQL', skills:['react','typescript','postgresql','api','testing','concurrency'],
      summary:'Expiring, revocable notes with a conditional database update for one-time access.',
      decision:'Claim a one-time note through a conditional PostgreSQL update inside a transaction.',
      tests:'Test source covers two competing readers and 25 simultaneous requests.',
      limit:'Content is not end-to-end encrypted. A committed claim stays consumed if the response is lost.',
      code:'https://github.com/oyadarsh-hue/secure-note-sharing-app/blob/b4437bcac4451c28042916e12bc23d56943317f2/src/server/shares.ts'},
    {id:'assenttag', name:'AssentTag', scope:'Academic application', stack:'Python, Django, MySQL, OpenCV', skills:['python','django','mysql','opencv','vision','api','testing'],
      summary:'Connects identity and consent workflows with face privacy in a Django application.',
      decision:'Use fallback face masks when landmark prediction fails.',
      tests:'Test source covers fallback masks, edge faces and predictor failures.',
      limit:'The public sample UI uses fictional data; full processing requires local services and dependencies.',
      code:'https://github.com/oyadarsh-hue/AssentTag/blob/a276677ba323ae9cc5018f6db4ebadf3f1be38ca/image/face_privacy.py'},
    {id:'aegisforge-x', name:'AegisForge-X', scope:'Local security review tool', stack:'Python, pattern rules, SHA-256', skills:['python','security','testing','hashing'],
      summary:'Finds review candidates with source coordinates and SHA-256 evidence fingerprints.',
      decision:'Keep rule findings traceable to source locations and evidence hashes.',
      tests:'Rule tests cover findings across several languages.',
      limit:'Heuristic findings require human review. An evidence hash does not establish that a finding is correct.',
      code:'https://github.com/oyadarsh-hue/AegisForge-X/blob/6a447bd90637fc0da5cecdda90ecd8ac4071da8b/aegisforge/scanner.py'},
    {id:'epigraphix-ai', name:'EpigraphiX-AI', scope:'Research prototype', stack:'Python, OpenCV, image processing', skills:['python','opencv','vision','testing'],
      summary:'Explores image restoration, segmentation and Malayalam lexicon post-processing.',
      decision:'Separate image preparation and segmentation from recognition and post-processing.',
      tests:'Pipeline test source is available for inspection.',
      limit:'The public recognition engine uses simulated attention and deterministic mapping, not demonstrated trained TrOCR inference.',
      code:'https://github.com/oyadarsh-hue/EpigraphiX-AI/blob/ff8eb60f048d767395d761342f42d3f55f1e7898/trocr_transformer_engine.py'},
    {id:'deciphera', name:'Deciphera', scope:'Browser simulator', stack:'JavaScript, HTML, CSS', skills:['javascript','html','css'],
      summary:'Turns structured transaction states into client, auditor and technical narratives.',
      decision:'Use explicit transaction states to produce different views for different audiences.',
      tests:'Manual browser review; no automated test evidence linked here.',
      limit:'Events and attestations are illustrative and do not verify real Bitcoin settlement.',
      code:'https://github.com/oyadarsh-hue/Deciphera-A-Semantic-Ledger-Covenant-Auditor-for-Bitcoin-Off-Chain-Transactions./blob/main/narrativeEngine.js'}
  ];
  const skills = [
    ['python','Python',['python']], ['django','Django',['django']], ['react','React',['react','react.js','reactjs']],
    ['typescript','TypeScript',['typescript']], ['javascript','JavaScript',['javascript','js']],
    ['postgresql','PostgreSQL',['postgresql','postgres']], ['mysql','MySQL',['mysql']],
    ['api','REST APIs',['rest','restful','api','apis']], ['testing','Testing',['testing','unit tests','test automation','automated tests']],
    ['concurrency','Concurrency',['concurrency','concurrent','race condition','race conditions','atomic']],
    ['opencv','OpenCV',['opencv']], ['vision','Computer vision',['computer vision','image processing','segmentation']],
    ['security','Security review',['security','static analysis','code scanning']], ['hashing','SHA-256',['sha-256','sha256','hashing']],
    ['html','HTML',['html','html5']], ['css','CSS',['css','css3']],
    ['aws','AWS',['aws','amazon web services']], ['kubernetes','Kubernetes',['kubernetes','k8s']],
    ['docker','Docker',['docker']], ['java','Java',['java']], ['go','Go',['golang']],
    ['csharp','C#',['c#','csharp']], ['tensorflow','TensorFlow',['tensorflow']], ['pytorch','PyTorch',['pytorch']],
    ['graphql','GraphQL',['graphql']], ['redis','Redis',['redis']]
  ].map(([id,label,aliases])=>({id,label,aliases}));
  const presets = {
    fullstack:'React, TypeScript, REST APIs, PostgreSQL, testing, concurrency',
    python:'Python, Django, MySQL, REST APIs, testing',
    vision:'Python, OpenCV, computer vision, image processing, testing',
    security:'Python, security, static analysis, SHA-256, testing'
  };
  const data = {projects, skills, presets, base:'https://oyadarsh-hue.github.io/Adarsh-S-Portfolio/'};
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else global.PortfolioEvidence = data;
})(globalThis);
