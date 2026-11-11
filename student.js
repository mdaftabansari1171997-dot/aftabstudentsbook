const $=id=>document.getElementById(id);
const sb=window.aftabSupabase;
const params=new URLSearchParams(window.location.search);
$('studentClassFilter').value=params.get('class_level')||'';
$('studentBoardFilter').value=params.get('board')||'';
$('studentLanguageFilter').value=params.get('language')||'';
function updateSelectedLabel(){
 const parts=[$('studentBoardFilter').value,$('studentClassFilter').value,$('studentLanguageFilter').value].filter(Boolean);
 $('selectedClassLabel').textContent=parts.length?parts.join(' • ')+' की सामग्री':'सभी उपलब्ध सामग्री';
}
updateSelectedLabel();
function normalizeStudentPhone(value){const digits=String(value||'').replace(/\D/g,'');return digits.length===10?'+91'+digits:(digits.startsWith('91')&&digits.length===12?'+'+digits:'');}
function setStudentAuthMode(mode){
 const login=mode==='login';
 $('studentLoginForm').hidden=!login;$('studentRegisterForm').hidden=login;
 $('showStudentLogin').classList.toggle('active',login);$('showStudentRegister').classList.toggle('active',!login);
 $('studentMessage').textContent='';
}
$('showStudentLogin').addEventListener('click',()=>setStudentAuthMode('login'));
$('showStudentRegister').addEventListener('click',()=>setStudentAuthMode('register'));
$('studentRegisterForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const name=$('registerName').value.trim(),phone=normalizeStudentPhone($('registerMobile').value),password=$('registerPassword').value;
 if(!phone){$('studentMessage').textContent='सही 10 अंकों का मोबाइल नंबर लिखें।';return;}
 if(password!==$('registerPassword2').value){$('studentMessage').textContent='दोनों Password एक जैसे नहीं हैं।';return;}
 $('studentMessage').textContent='Registration हो रहा है…';
 const email=$('registerEmail').value.trim().toLowerCase();
 const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name,phone}}});
 if(error){$('studentMessage').textContent='Registration error: '+error.message;return;}
 if(!data.session){$('studentMessage').textContent='Registration request सफल हुई। अपने Email Inbox में Supabase का verification link खोलें, फिर यहाँ Email और Password से Login करें। Spam folder भी देखें।';return;}
 const {error:profileError}=await sb.from('profiles').upsert({id:data.user.id,full_name:name,phone},{onConflict:'id'});
 if(profileError){$('studentMessage').textContent='Account बन गया, Profile save error: '+profileError.message;return;}
 showDashboard({name,phone});
});
$('studentLoginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const email=$('loginEmail').value.trim().toLowerCase(),password=$('loginPassword').value;
 if(!email){$('studentMessage').textContent='सही Email ID लिखें।';return;}
 $('studentMessage').textContent='Login हो रहा है…';
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){$('studentMessage').textContent='Login error: '+error.message;return;}
 const {data:profile}=await sb.from('profiles').select('full_name,phone,role').eq('id',data.user.id).maybeSingle();
 if(profile?.role==='disabled'){await sb.auth.signOut();$('studentMessage').textContent='आपका Student Login Admin द्वारा बंद किया गया है। कृपया Coaching Center से संपर्क करें।';return;}
 const studentName=profile?.full_name||data.user.user_metadata?.full_name||'Student';
 const studentPhone=profile?.phone||data.user.user_metadata?.phone||'';
 if(!profile){const {error:saveError}=await sb.from('profiles').upsert({id:data.user.id,full_name:studentName,phone:studentPhone},{onConflict:'id'});if(saveError){$('studentMessage').textContent='Login हुआ, Profile save error: '+saveError.message;return;}}
 showDashboard({name:studentName,phone:studentPhone||'—'});
});
$('studentLogout').addEventListener('click',async()=>{
 await sb.auth.signOut();$('studentDashboard').hidden=true;$('loginBox').hidden=false;
 $('studentLoginForm').reset();$('studentRegisterForm').reset();setStudentAuthMode('login');
 $('studentMessage').textContent='आप लॉगआउट हो गए हैं।';
});
async function showDashboard(profile){
 $('loginBox').hidden=true;$('studentDashboard').hidden=false;
 $('welcomeName').textContent=profile.name||'Student';$('profileName').textContent=profile.name||'—';
 $('profileMobile').textContent=profile.phone||'—';$('profileMobile2').textContent=profile.phone||'—';
 await loadMaterials();
}
async function loadMaterials(){
 const box=$('studentMaterials');box.innerHTML='<p class="muted">Study Material लोड हो रहा है…</p>';
 let query=sb.from('study_materials').select('*').eq('is_published',true).order('created_at',{ascending:false});
 const board=$('studentBoardFilter').value,classLevel=$('studentClassFilter').value,language=$('studentLanguageFilter').value;
 if(board)query=query.eq('board',board);
 if(classLevel)query=query.eq('class_level',classLevel);
 if(language)query=query.eq('language',language);
 const {data,error}=await query;
 if(error){box.textContent='सामग्री लोड नहीं हुई: '+error.message;return;}
 box.innerHTML='';
 if(!data?.length){box.innerHTML='<p class="muted">इस चयन के लिए अभी सामग्री उपलब्ध नहीं है। Admin Dashboard में सही Board, Class और Medium चुनकर सामग्री प्रकाशित करें।</p>';return;}
 for(const item of data){
  const row=document.createElement('article');row.className='resource-item';
  const info=document.createElement('div');info.className='resource-info';
  const title=document.createElement('b');title.textContent=item.title;
  const meta=document.createElement('small');meta.textContent=[item.board,item.class_level,item.course,item.university,item.subject,item.material_type,item.language].filter(Boolean).join(' • ');
  info.append(title,meta);row.append(info);
  if(item.file_path){
   const btn=document.createElement('button');btn.type='button';btn.textContent='PDF खोलें';
   btn.addEventListener('click',async()=>{
    btn.disabled=true;btn.textContent='खुल रहा है…';
    const {data:fileData,error:fileError}=await sb.storage.from('study-pdfs').createSignedUrl(item.file_path,300);
    btn.disabled=false;btn.textContent='PDF खोलें';
    if(fileError){alert('PDF नहीं खुल सकी: '+fileError.message);return;}
    window.open(fileData.signedUrl,'_blank','noopener');
   });
   row.append(btn);
  }else{const tag=document.createElement('span');tag.className='material-no-file';tag.textContent='PDF उपलब्ध नहीं';row.append(tag);}
  box.append(row);
 }
}
['studentBoardFilter','studentClassFilter','studentLanguageFilter'].forEach(id=>$(id).addEventListener('change',()=>{updateSelectedLabel();loadMaterials();loadStudentQuizzes();}));
(async()=>{
 const {data:{user},error}=await sb.auth.getUser();if(error)return;
 if(user){const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(data?.role==='disabled'){await sb.auth.signOut();$('studentMessage').textContent='आपका Student Login Admin द्वारा बंद किया गया है। कृपया Coaching Center से संपर्क करें।';}else if(data)showDashboard({name:data.full_name,phone:data.phone});}
})();

async function loadStudentQuizzes(){
 const list=$('studentQuizList');if(!list)return;
 const classLevel=$('studentClassFilter').value;
 let query=sb.from('mcq_quizzes').select('id,title,board,class_level,subject,duration_minutes').eq('is_published',true).order('created_at',{ascending:false});
 if(classLevel)query=query.eq('class_level',classLevel);
 const {data,error}=await query;list.innerHTML='';
 if(error){list.textContent='MCQ Tests लोड नहीं हुए: '+error.message;return;}
 if(!data?.length){list.textContent='इस कक्षा के लिए अभी कोई MCQ Test प्रकाशित नहीं है।';return;}
 for(const q of data){const row=document.createElement('div');row.className='resource-item';const info=document.createElement('div');const b=document.createElement('b');b.textContent=q.title;const sm=document.createElement('small');sm.textContent=[q.board,q.class_level,q.subject,q.duration_minutes+' मिनट'].join(' • ');info.append(b,sm);const btn=document.createElement('button');btn.textContent='टेस्ट शुरू करें';btn.onclick=()=>startQuiz(q);row.append(info,btn);list.append(row);}
}
async function startQuiz(quiz){
 const runner=$('quizRunner');runner.hidden=false;runner.innerHTML='<p>प्रश्न लोड हो रहे हैं…</p>';
 const {data:questions,error}=await sb.from('mcq_student_questions').select('id,quiz_id,question_text,option_a,option_b,option_c,option_d,sort_order').eq('quiz_id',quiz.id).order('sort_order');
 if(error){runner.textContent=error.message;return;}
 if(!questions?.length){runner.textContent='इस Test में अभी प्रश्न नहीं जोड़े गए हैं।';return;}
 let current=0;const answers={};
 const draw=()=>{
  const q=questions[current];runner.innerHTML='';
  const head=document.createElement('div');head.className='quiz-runner-head';head.textContent=quiz.title+' • प्रश्न '+(current+1)+'/'+questions.length;runner.append(head);
  const h=document.createElement('h3');h.textContent=q.question_text;runner.append(h);
  ['A','B','C','D'].forEach(letter=>{const btn=document.createElement('button');btn.className='quiz-option';btn.textContent=letter+'. '+q['option_'+letter.toLowerCase()];if(answers[q.id]===letter)btn.classList.add('selected');btn.onclick=()=>{answers[q.id]=letter;draw();};runner.append(btn);});
  const nav=document.createElement('div');nav.className='quiz-navigation';
  if(current>0){const prev=document.createElement('button');prev.textContent='पिछला';prev.onclick=()=>{current--;draw();};nav.append(prev);}
  if(current<questions.length-1){const next=document.createElement('button');next.textContent='अगला';next.onclick=()=>{current++;draw();};nav.append(next);}
  else{const finish=document.createElement('button');finish.textContent='टेस्ट जमा करें';finish.onclick=()=>submitQuiz(quiz,questions,answers);nav.append(finish);}
  runner.append(nav);
 };
 draw();
}
async function submitQuiz(quiz,questions,answers){
 if(!confirm('क्या आप अपना टेस्ट जमा करना चाहते हैं?'))return;
 const answerPayload=questions.map(q=>({question_id:q.id,selected:answers[q.id]||null}));
 const {data,error}=await sb.rpc('submit_mcq_attempt',{p_quiz_id:quiz.id,p_answers:answerPayload});
 if(error){alert('Result सेव नहीं हुआ: '+error.message);return;}
 const runner=$('quizRunner');runner.innerHTML='';
 const h=document.createElement('h3');h.textContent='आपका परिणाम';runner.append(h);
 const scoreText=document.createElement('p');scoreText.className='quiz-score';scoreText.textContent=data.score+' / '+data.total_questions+' सही ('+Math.round(data.score/data.total_questions*100)+'%)';runner.append(scoreText);
 (data.answers||[]).forEach((d,i)=>{const p=document.createElement('p');p.className='quiz-answer-review';p.textContent='प्रश्न '+(i+1)+': '+(d.is_correct?'सही':'गलत')+' • सही उत्तर: '+d.correct_option+(d.explanation?' • '+d.explanation:'');runner.append(p);});
 loadQuizHistory();
}
async function loadQuizHistory(){
 const box=$('quizHistory');if(!box)return;
 const {data,error}=await sb.from('mcq_attempts').select('id,quiz_id,score,total_questions,submitted_at').order('submitted_at',{ascending:false}).limit(20);
 box.innerHTML='<h3>आपके पुराने परिणाम</h3>';
 if(error){box.append(document.createTextNode(error.message));return;}
 for(const a of data||[]){const p=document.createElement('p');p.textContent='Test #'+a.quiz_id+' — '+a.score+'/'+a.total_questions+' • '+new Date(a.submitted_at).toLocaleString();box.append(p);}
}
const previousStudentShowDashboard=showDashboard;
showDashboard=async profile=>{await previousStudentShowDashboard(profile);await loadStudentQuizzes();await loadQuizHistory();};

async function loadStudentProfile(){
 const {data:{user}}=await sb.auth.getUser();if(!user)return;
 const {data,error}=await sb.from('profiles').select('full_name,phone,board,class_level,medium').eq('id',user.id).maybeSingle();
 if(error){$('profileSaveMessage').textContent=error.message;return;}
 $('profileEditName').value=data?.full_name||'';
 $('profileEditMobile').value=data?.phone||user.phone||'';
 $('profileEditBoard').value=data?.board||'';
 $('profileEditClass').value=data?.class_level||'';
 $('profileEditMedium').value=data?.medium||'';
}
$('profileForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const {data:{user}}=await sb.auth.getUser();if(!user)return;
 const payload={id:user.id,full_name:$('profileEditName').value.trim(),phone:user.phone||$('profileEditMobile').value,board:$('profileEditBoard').value||null,class_level:$('profileEditClass').value||null,medium:$('profileEditMedium').value||null,updated_at:new Date().toISOString()};
 const {error}=await sb.from('profiles').upsert(payload,{onConflict:'id'});
 $('profileSaveMessage').textContent=error?'सेव नहीं हुआ: '+error.message:'आपकी Profile सेव हो गई।';
 if(!error){$('welcomeName').textContent=payload.full_name;$('profileName').textContent=payload.full_name;$('profileMobile').textContent=payload.phone||'—';$('profileMobile2').textContent=payload.phone||'—';}
});
async function loadStudentLeaderboard(){
 const box=$('studentLeaderboard');if(!box)return;
 const {data,error}=await sb.rpc('get_mcq_leaderboard',{p_limit:10});
 box.innerHTML='';
 if(error){box.textContent='Leaderboard लोड नहीं हुआ: '+error.message;return;}
 if(!data?.length){box.textContent='अभी कोई प्रकाशित टेस्ट परिणाम नहीं है।';return;}
 data.forEach((x,i)=>{const row=document.createElement('div');row.className='leaderboard-row';const rank=document.createElement('b');rank.textContent='#'+(i+1);const name=document.createElement('span');name.textContent=x.student_name+' • '+(x.class_level||'Class not set');const score=document.createElement('strong');score.textContent=x.percentage+'% ('+x.total_score+'/'+x.total_questions+')';row.append(rank,name,score);box.append(row);});
}
const oldShowDashboardForProfile=showDashboard;
showDashboard=async profile=>{await oldShowDashboardForProfile(profile);await loadStudentProfile();await loadStudentLeaderboard();};

async function loadMyCertificates(){
 const box=$('myCertificates');if(!box)return;
 box.textContent='आपके परिणाम खोजे जा रहे हैं…';
 const {data,error:authError}=await sb.auth.getUser();
 if(authError){box.textContent='Login जाँच नहीं हो सकी: '+authError.message;return;}
 const user=data?.user;
 if(!user){box.textContent='कृपया Student Portal में दोबारा Login करें।';return;}
 const {data:attempts,error}=await sb.from('mcq_attempts').select('id,quiz_id,score,total_questions,submitted_at').eq('student_id',user.id).order('submitted_at',{ascending:false});
 box.innerHTML='';
 if(error){box.textContent=error.message;return;}
 if(!attempts?.length){box.textContent='अभी कोई टेस्ट परिणाम नहीं है।';return;}
 const {data:settings, error:settingsError}=await sb.from('certificate_settings').select('*').eq('id',1).maybeSingle();
 if(settingsError){box.textContent='Certificate Settings error: '+settingsError.message;return;}
 const {data:quizzes,error:quizError}=await sb.from('mcq_quizzes').select('id,title').in('id',[...new Set(attempts.map(a=>a.quiz_id))]);
 if(quizError){box.textContent='Test details error: '+quizError.message;return;}
 for(const a of attempts){const q=(quizzes||[]).find(x=>x.id===a.quiz_id);const row=document.createElement('div');row.className='resource-item';const info=document.createElement('div');const b=document.createElement('b');b.textContent=q?.title||'MCQ Test';const sm=document.createElement('small');sm.textContent=a.score+'/'+a.total_questions+' • '+Math.round(100*a.score/a.total_questions)+'% • '+new Date(a.submitted_at).toLocaleDateString();info.append(b,sm);const btn=document.createElement('button');btn.textContent='Certificate Print / PDF';btn.onclick=()=>printCertificate(a,q,settings);row.append(info,btn);box.append(row);}
}
function printCertificate(attempt,quiz,settings){
 const name=$('profileEditName')?.value||$('welcomeName').textContent||'Student';
 const center=settings?.center_name||'Aftab Students Book';
 const pct=Math.round(100*attempt.score/attempt.total_questions);
 const grade=pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=40?'D':'Needs Improvement';
 const certId='ASB-'+String(attempt.id).padStart(6,'0');
 const issued=new Date(attempt.submitted_at).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
 const w=window.open('','_blank');if(!w){alert('कृपया इस साइट के लिए pop-up अनुमति दें।');return;}
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Certificate of Achievement</title><style>'+
 '*{box-sizing:border-box}body{margin:0;padding:22px;background:#f4f1e8;color:#263247;font-family:Georgia,"Times New Roman",serif}.cert{position:relative;max-width:1050px;min-height:690px;margin:0 auto;padding:52px 64px;text-align:center;background:#fffdf7;border:12px double #b58a32;outline:2px solid #e7cf8d;outline-offset:-23px;box-shadow:0 12px 40px #47340f22;overflow:hidden}.cert:before,.cert:after{content:"✦  ✧  ✦";position:absolute;color:#c39a42;font-size:25px;letter-spacing:12px}.cert:before{top:22px;left:30px}.cert:after{bottom:22px;right:30px}.cert-logo{width:92px;height:92px;object-fit:contain;display:block;margin:0 auto 8px}.topline{font:700 11px Arial,sans-serif;letter-spacing:5px;color:#8d6a26;text-transform:uppercase}.brand{font:700 25px Georgia,serif;letter-spacing:1.5px;color:#7d5b1d;margin:14px 0 4px}.rule{width:150px;height:2px;background:linear-gradient(90deg,transparent,#b58a32,transparent);margin:17px auto}.cert h1{font:700 43px Georgia,serif;letter-spacing:2px;color:#9a7428;margin:18px 0 8px;text-transform:uppercase}.subtitle{font:italic 17px Georgia,serif;color:#657080}.present{margin:34px 0 12px;font:italic 17px Georgia,serif;color:#596579}.name{display:inline-block;min-width:360px;padding:7px 25px 12px;border-bottom:2px solid #c19a48;font:700 34px Georgia,serif;color:#263247}.description{font:16px Georgia,serif;color:#596579;margin:25px 0 10px}.test{font:700 23px Georgia,serif;color:#34445d;margin:12px 0}.score{display:inline-block;margin:20px auto 10px;padding:12px 25px;border:1px solid #d5bd82;background:#fffaf0;border-radius:4px;font:700 17px Arial,sans-serif;color:#75591e}.certid{font:12px Arial,sans-serif;color:#7b8491;letter-spacing:1px;margin-top:15px}.seal{width:88px;height:88px;border:3px double #b58a32;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:15px auto 0;color:#987225;font:700 11px Arial,sans-serif;letter-spacing:1px;transform:rotate(-9deg);background:#fffdf7}.seal span{display:block;border:1px solid #d8c18a;border-radius:50%;padding:17px 8px}.footer{display:flex;justify-content:space-between;align-items:flex-end;gap:28px;margin-top:28px;font:12px Arial,sans-serif;color:#526075}.sign{min-width:210px;text-align:center}.signature-word{font-family:"Brush Script MT","Segoe Script",cursive;font-size:44px;font-style:italic;font-weight:700;letter-spacing:2px;line-height:1;color:#173b70;transform:rotate(-8deg);margin:0 0 5px;text-shadow:1px 1px 0 #d7c18d}.signline{border-top:1px solid #8e7950;padding-top:8px;margin-top:8px;font-weight:700;color:#34445d}.issued{text-align:left}.address{font:11px Arial,sans-serif;color:#7b8491;margin-top:24px;line-height:1.7}.printbar{text-align:center;margin:18px auto}.printbar button{border:0;border-radius:7px;background:#8c6825;color:white;padding:11px 22px;font-weight:700;cursor:pointer}@page{size:A4 landscape;margin:10mm}@media print{body{padding:0;background:#fff}.cert{max-width:none;min-height:180mm;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}.printbar{display:none}}@media(max-width:700px){body{padding:8px}.cert{padding:48px 24px;min-height:0}.cert h1{font-size:29px}.name{min-width:0;max-width:100%;font-size:26px}.footer{flex-direction:column;align-items:stretch}.issued{text-align:center}}'+
 '</style></head><body><div class="cert"><img class="cert-logo" src="assets/aftab-students-book-logo.svg" alt="Aftab Students Book"><div class="topline">Certificate of Achievement</div><div class="brand">'+escapeCert(center)+'</div><div class="rule"></div><h1>Certificate</h1><div class="subtitle">of Academic Excellence</div><p class="present">This certificate is proudly presented to</p><div class="name">'+escapeCert(name)+'</div><p class="description">For completing the following online assessment</p><div class="test">'+escapeCert(quiz?.title||'Online MCQ Test')+'</div><div class="score">Score: '+attempt.score+'/'+attempt.total_questions+' &nbsp; | &nbsp; '+pct+'% &nbsp; | &nbsp; Grade '+grade+'</div><div class="certid">CERTIFICATE ID: '+certId+'</div><div class="seal"><span>VERIFIED<br>ACHIEVEMENT</span></div><div class="footer"><div class="issued">Date of Issue<br><b>'+issued+'</b></div><div class="sign"><div class="signature-word">AFTAB</div><div class="signline">'+escapeCert(settings?.contact_name||'Authorized Signatory')+'<br><span style="font-weight:400">Authorized Signatory</span></div></div></div><div class="address">'+escapeCert(settings?.address||'')+'<br>'+escapeCert(settings?.phone||'')+' &nbsp; '+escapeCert(settings?.email||'')+'</div></div><div class="printbar"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>');
 w.document.close();
}
function escapeCert(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
/* Single dashboard loader: avoids nested async showDashboard wrappers. */
showDashboard=async profile=>{
 $('loginBox').hidden=true;
 $('studentDashboard').hidden=false;
 $('welcomeName').textContent=profile?.name||'Student';
 if($('profileName'))$('profileName').textContent=profile?.name||'—';
 $('profileMobile').textContent=profile?.phone||'—';
 if($('profileMobile2'))$('profileMobile2').textContent=profile?.phone||'—';
 const tasks=[
  ['Study Material',loadMaterials,'studentMaterials'],
  ['MCQ Tests',loadStudentQuizzes,'studentQuizList'],
  ['Quiz History',loadQuizHistory,'quizHistory'],
  ['Student Profile',loadStudentProfile,'profileSaveMessage'],
  ['Leaderboard',loadStudentLeaderboard,'studentLeaderboard'],
  ['Certificates',loadMyCertificates,'myCertificates']
 ];
 await Promise.all(tasks.map(async([label,fn,id])=>{
  try{await fn();}catch(err){const el=$(id);if(el)el.textContent=label+' error: '+(err?.message||String(err));}
 }));
};
/* Certificate panel boot: independent of dashboard callback wrapping. */
(async()=>{
 const box=$('myCertificates');if(!box)return;
 box.textContent='प्रमाणपत्र सूची जाँची जा रही है…';
 try{
  const {data,error}=await sb.auth.getSession();
  if(error){box.textContent='Session error: '+error.message;return;}
  if(data?.session?.user){
   if($('studentDashboard').hidden===false) await loadMyCertificates();
  }else{
   box.textContent='विद्यार्थी Login करने के बाद आपके प्रमाणपत्र यहाँ दिखेंगे।';
  }
 }catch(err){box.textContent='Certificate error: '+(err?.message||String(err));}
})();
