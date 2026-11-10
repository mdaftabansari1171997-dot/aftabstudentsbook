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
$('mobileForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const name=$('studentName').value.trim(),phone=$('mobile').value.trim();
 if(!/^[6-9][0-9]{9}$/.test(phone)){$('studentMessage').textContent='कृपया सही 10 अंकों का भारतीय मोबाइल नंबर लिखें।';return;}
 $('studentMessage').textContent='OTP भेजा जा रहा है…';
 const {error}=await sb.auth.signInWithOtp({phone:'+91'+phone,options:{channel:'sms'}});
 if(error){$('studentMessage').textContent='OTP नहीं भेजा जा सका: '+error.message;return;}
 sessionStorage.setItem('aftab_pending_name',name);sessionStorage.setItem('aftab_pending_phone','+91'+phone);
 $('mobileForm').hidden=true;$('otpForm').hidden=false;$('studentMessage').textContent='आपके मोबाइल पर SMS OTP भेजा गया है।';
});
$('otpForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const phone=sessionStorage.getItem('aftab_pending_phone'),name=sessionStorage.getItem('aftab_pending_name'),token=$('otp').value.trim();
 const {data,error}=await sb.auth.verifyOtp({phone,token,type:'sms'});
 if(error){$('studentMessage').textContent='OTP verification failed: '+error.message;return;}
 const {error:profileError}=await sb.from('profiles').upsert({id:data.user.id,full_name:name,phone},{onConflict:'id'});
 if(profileError){$('studentMessage').textContent='Login हो गया, लेकिन profile save नहीं हुई: '+profileError.message;return;}
 showDashboard({name,phone});
});
$('backToMobile').addEventListener('click',()=>{$('otpForm').hidden=true;$('mobileForm').hidden=false;$('studentMessage').textContent='';});
$('studentLogout').addEventListener('click',async()=>{
 await sb.auth.signOut();$('studentDashboard').hidden=true;$('loginBox').hidden=false;
 $('mobileForm').reset();$('otpForm').reset();$('otpForm').hidden=true;$('mobileForm').hidden=false;
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
 if(user){const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(data)showDashboard({name:data.full_name,phone:data.phone});}
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
 const w=window.open('','_blank');if(!w){alert('कृपया इस साइट के लिए pop-up अनुमति दें।');return;}
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Certificate</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#172943}.cert{border:10px double #bd943d;padding:42px;text-align:center;max-width:850px;margin:auto;min-height:480px}.brand{font-size:14px;letter-spacing:3px;color:#9a7428}.cert h1{font-size:38px;color:#9a7428;margin:24px}.name{font-size:30px;font-weight:bold;border-bottom:1px solid #aaa;display:inline-block;padding:8px 30px}.score{font-size:22px;margin:24px}.meta{display:flex;justify-content:space-between;margin-top:65px;font-size:13px}.address{font-size:12px;margin-top:8px}@media print{button{display:none}}</style></head><body><div class="cert"><div class="brand">'+escapeCert(center)+'</div><h1>Certificate of Achievement</h1><p>This certificate is proudly presented to</p><div class="name">'+escapeCert(name)+'</div><p>for successfully completing</p><h2>'+escapeCert(quiz?.title||'Online MCQ Test')+'</h2><div class="score">Score: '+attempt.score+'/'+attempt.total_questions+' &nbsp; | &nbsp; '+pct+'% &nbsp; | &nbsp; Grade '+grade+'</div><p>Certificate ID: '+certId+'</p><div class="meta"><span>Issued: '+new Date(attempt.submitted_at).toLocaleDateString()+'</span><span>Authorized Signatory<br>'+escapeCert(settings?.contact_name||'Administrator')+'</span></div><div class="address">'+escapeCert(settings?.address||'')+'<br>'+escapeCert(settings?.phone||'')+' '+escapeCert(settings?.email||'')+'</div></div><script>window.onload=()=>window.print()<\/script></body></html>');
 w.document.close();
}
function escapeCert(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const beforeProfileDashboard=showDashboard;
showDashboard=async profile=>{
 await beforeProfileDashboard(profile);
 try{await loadMyCertificates();}catch(err){const box=$('myCertificates');if(box)box.textContent='Certificate load error: '+(err?.message||String(err));}
};
