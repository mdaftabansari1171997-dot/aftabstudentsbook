const $=id=>document.getElementById(id);
const sb=window.aftabSupabase;
for(let n=1;n<=12;n++)$('class').add(new Option('Class '+n,'Class '+n));
for(let n=1;n<=6;n++)$('class').add(new Option('BA Semester '+n,'Semester '+n));
for(let n=1;n<=3;n++)$('class').add(new Option('BA Part '+n,'Part '+n));
for(const course of ['BSc','BCom','BCA','BBA','MA','MSc','MCom'])$('class').add(new Option(course+' (General)','General'));
async function currentAdmin(){
 const {data:{user}}=await sb.auth.getUser();if(!user)return false;
 const {data,error}=await sb.from('profiles').select('role').eq('id',user.id).single();
 return !error && data?.role==='admin';
}
async function showDashboard(){ $('loginCard').hidden=true;$('dashboard').hidden=false;await render(); }
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();$('loginError').textContent='Checking login…';
 const {error}=await sb.auth.signInWithPassword({email:$('username').value.trim(),password:$('password').value});
 if(error){$('loginError').textContent=error.message;return;}
 if(!(await currentAdmin())){await sb.auth.signOut();$('loginError').textContent='इस अकाउंट को Admin access नहीं मिला है। पहले SQL से role=admin सेट करें।';return;}
 $('loginError').textContent='';await showDashboard();
});
$('logout').addEventListener('click',async()=>{await sb.auth.signOut();$('dashboard').hidden=true;$('loginCard').hidden=false;$('password').value=''});
async function render(){
 const {data,error}=await sb.from('study_materials').select('*').order('created_at',{ascending:false});
 if(error){$('resourceList').textContent='Database error: '+error.message;return;}
 const items=data||[];$('totalResources').textContent=items.length;$('pdfResources').textContent=items.filter(x=>x.file_path).length;$('mcqResources').textContent=items.filter(x=>x.material_type==='MCQ').length;
 const list=$('resourceList');list.innerHTML='';if(!items.length){list.innerHTML='<p class="muted">अभी कोई सामग्री नहीं है।</p>';return;}
 for(const x of items){const row=document.createElement('div');row.className='resource-item';const info=document.createElement('div');const b=document.createElement('b');b.textContent=x.title;const sm=document.createElement('small');sm.textContent=`${x.board} • ${x.course||''} • ${x.class_level||''} • ${x.university||''} • ${x.subject} • ${x.material_type} • ${x.language}`;info.append(b,sm);
 const actions=document.createElement('div');actions.style.display='flex';actions.style.gap='6px';
 if(x.file_path){const link=document.createElement('button');link.className='small-btn';link.textContent='PDF';link.onclick=async()=>{const {data,error}=await sb.storage.from('study-pdfs').createSignedUrl(x.file_path,300);if(error)alert(error.message);else window.open(data.signedUrl,'_blank','noopener')};actions.append(link);}
 const del=document.createElement('button');del.className='delete-btn';del.textContent='Delete';del.onclick=async()=>{if(!confirm('इस सामग्री को हटाएँ?'))return;const {error}=await sb.from('study_materials').delete().eq('id',x.id);if(error)alert(error.message);else{if(x.file_path)await sb.storage.from('study-pdfs').remove([x.file_path]);await render()}};actions.append(del);row.append(info,actions);list.append(row);}
}
$('resourceForm').addEventListener('submit',async e=>{
 e.preventDefault();$('saveMessage').textContent='Saving…';const {data:{user}}=await sb.auth.getUser();if(!user){$('saveMessage').textContent='Please login again.';return;}
 const file=$('pdf').files[0];let path=null;
 if(file){if(file.type!=='application/pdf'){$('saveMessage').textContent='कृपया PDF फाइल चुनें।';return;}if(file.size>10*1024*1024){$('saveMessage').textContent='PDF अधिकतम 10 MB हो सकती है।';return;}
 path=`${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
 const {error}=await sb.storage.from('study-pdfs').upload(path,file,{contentType:'application/pdf',upsert:false});if(error){$('saveMessage').textContent=error.message;return;}}
 const payload={title:$('title').value.trim(),board:$('board').value,class_level:$('class').value,course:$('course').value.trim(),university:$('university').value,subject:$('subject').value.trim(),material_type:$('type').value,language:$('medium').value,file_path:path,is_published:true,created_by:user.id};
 const {error}=await sb.from('study_materials').insert(payload);
 if(error){if(path)await sb.storage.from('study-pdfs').remove([path]);$('saveMessage').textContent=error.message;return;}
 e.target.reset();$('saveMessage').textContent='सामग्री ऑनलाइन सेव हो गई।';await render();
});
$('export').addEventListener('click',async()=>{const {data,error}=await sb.from('study_materials').select('*');if(error){alert(error.message);return;}const keys=['title','board','class_level','course','university','subject','language','material_type','file_path','created_at'];const csv=[keys.join(','),...(data||[]).map(x=>keys.map(k=>'"'+String(x[k]??'').replaceAll('"','""')+'"').join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='aftab-study-material.csv';a.click();URL.revokeObjectURL(a.href)});
(async()=>{if(await currentAdmin())await showDashboard()})();

async function loadMcqAdmin(){
 const {data:quizzes,error}=await sb.from('mcq_quizzes').select('*').order('created_at',{ascending:false});
 if(error){$('adminQuizList').textContent='MCQ error: '+error.message;return;}
 const select=$('questionQuizSelect');select.innerHTML='<option value="">Test चुनें</option>';
 const list=$('adminQuizList');list.innerHTML='';
 for(const q of quizzes||[]){
  select.add(new Option(q.title+' ('+q.class_level+')',q.id));
  const row=document.createElement('div');row.className='resource-item';
  const info=document.createElement('div');const b=document.createElement('b');b.textContent=q.title;const sm=document.createElement('small');sm.textContent=[q.board,q.class_level,q.subject,q.duration_minutes+' min',q.is_published?'Published':'Draft'].join(' • ');info.append(b,sm);
  const actions=document.createElement('div');actions.style.display='flex';actions.style.gap='6px';
  const pub=document.createElement('button');pub.className='small-btn';pub.textContent=q.is_published?'Unpublish':'Publish';pub.onclick=async()=>{const {error}=await sb.from('mcq_quizzes').update({is_published:!q.is_published}).eq('id',q.id);if(error)alert(error.message);else loadMcqAdmin();};
  const del=document.createElement('button');del.className='delete-btn';del.textContent='Delete';del.onclick=async()=>{if(confirm('इस MCQ Test और इसके प्रश्न हटाएँ?')){const {error}=await sb.from('mcq_quizzes').delete().eq('id',q.id);if(error)alert(error.message);else loadMcqAdmin();}};
  actions.append(pub,del);row.append(info,actions);list.append(row);
 }

 const {data:attempts,error:attemptError}=await sb.from('mcq_attempts').select('id,quiz_id,student_id,score,total_questions,submitted_at').order('submitted_at',{ascending:false}).limit(100);
 const results=$('mcqResults');results.innerHTML='';
 if(attemptError){results.textContent='Results error: '+attemptError.message;return;}
 const studentIds=[...new Set((attempts||[]).map(x=>x.student_id))];
 let profileMap={};
 if(studentIds.length){const {data:profiles, error:profileError}=await sb.from('profiles').select('id,full_name,phone,class_level,board').in('id',studentIds);if(!profileError)for(const p of profiles||[])profileMap[p.id]=p;}
 for(const at of attempts||[]){
  const q=(quizzes||[]).find(x=>x.id===at.quiz_id),p=profileMap[at.student_id]||{};
  const row=document.createElement('div');row.className='resource-item';
  const info=document.createElement('div');const b=document.createElement('b');b.textContent=(p.full_name||'Student')+' — '+(q?.title||'MCQ Test')+' — '+at.score+'/'+at.total_questions;
  const sm=document.createElement('small');sm.textContent=[p.phone,p.board,p.class_level,new Date(at.submitted_at).toLocaleString()].filter(Boolean).join(' • ');
  info.append(b,sm);
  const certBtn=document.createElement('button');certBtn.type='button';certBtn.className='small-btn';certBtn.textContent='Certificate देखें / Print';certBtn.addEventListener('click',()=>adminPrintCertificate(at,p,q));row.append(info,certBtn);results.append(row);
 }
 if(!attempts?.length)results.innerHTML='<p class="muted">अभी कोई विद्यार्थी परिणाम नहीं है।</p>';

}
$('quizForm').addEventListener('submit',async e=>{
 e.preventDefault();const {data:{user}}=await sb.auth.getUser();
 const {error}=await sb.from('mcq_quizzes').insert({title:$('quizTitle').value.trim(),board:$('quizBoard').value,class_level:$('quizClass').value,subject:$('quizSubject').value.trim(),duration_minutes:Number($('quizDuration').value),created_by:user.id,is_published:false});
 $('quizSaveMessage').textContent=error?error.message:'MCQ Test बन गया। अब प्रश्न जोड़ें और Publish करें।';
 if(!error){e.target.reset();$('quizDuration').value=15;await loadMcqAdmin();}
});
$('questionForm').addEventListener('submit',async e=>{
 e.preventDefault();const quizId=$('questionQuizSelect').value;if(!quizId){$('questionSaveMessage').textContent='पहले Test चुनें।';return;}
 const {data:existing,error:countError}=await sb.from('mcq_questions').select('id').eq('quiz_id',quizId);
 if(countError){$('questionSaveMessage').textContent=countError.message;return;}
 const payload={quiz_id:Number(quizId),question_text:$('questionText').value.trim(),option_a:$('optionA').value.trim(),option_b:$('optionB').value.trim(),option_c:$('optionC').value.trim(),option_d:$('optionD').value.trim(),correct_option:$('correctOption').value,explanation:$('questionExplanation').value.trim(),sort_order:existing.length};
 const {error}=await sb.from('mcq_questions').insert(payload);$('questionSaveMessage').textContent=error?error.message:'प्रश्न सेव हो गया।';
 if(!error){e.target.reset();await loadMcqAdmin();}
});
const previousShowDashboard=showDashboard;
showDashboard=async()=>{await previousShowDashboard();await loadMcqAdmin();};

async function loadCertificateSettings(){
 const {data,error}=await sb.from('certificate_settings').select('*').eq('id',1).maybeSingle();
 if(error){$('certificateSettingsMessage').textContent=error.message;return;}
 if(data){$('centerName').value=data.center_name||'';$('centerContactName').value=data.contact_name||'';$('centerPhone').value=data.phone||'';$('centerEmail').value=data.email||'';$('centerAddress').value=data.address||'';}
}
$('certificateSettingsForm').addEventListener('submit',async e=>{
 e.preventDefault();const {data:{user}}=await sb.auth.getUser();
 const payload={id:1,center_name:$('centerName').value.trim(),contact_name:$('centerContactName').value.trim(),phone:$('centerPhone').value.trim(),email:$('centerEmail').value.trim(),address:$('centerAddress').value.trim(),updated_at:new Date().toISOString(),updated_by:user.id};
 const {error}=await sb.from('certificate_settings').upsert(payload,{onConflict:'id'});
 $('certificateSettingsMessage').textContent=error?'Save नहीं हुआ: '+error.message:'Certificate details सेव हो गए।';
});
async function loadStudentDirectory(){
 const box=$('studentDirectory');box.textContent='लोड हो रहा है…';
 const term=$('studentSearch').value.trim();
 let query=sb.from('profiles').select('id,full_name,phone,board,class_level,medium,role,created_at').order('created_at',{ascending:false}).limit(500);
 if(term)query=query.or('full_name.ilike.%'+term+'%,phone.ilike.%'+term+'%,class_level.ilike.%'+term+'%,id.eq.'+term);
 const {data,error}=await query;box.innerHTML='';
 if(error){box.textContent='Student list error: '+error.message;return;}
 if(!data?.length){box.textContent='कोई विद्यार्थी नहीं मिला।';return;}
 for(const p of data){
  const row=document.createElement('div');row.className='resource-item';
  const info=document.createElement('div');const b=document.createElement('b');b.textContent=p.full_name||'नाम उपलब्ध नहीं';
  const sm=document.createElement('small');sm.textContent=[p.phone,p.board,p.class_level,p.medium,p.role==='disabled'?'DISABLED':'Active','ID: '+p.id].filter(Boolean).join(' • ');info.append(b,sm);
  const actions=document.createElement('div');actions.style.display='flex';actions.style.flexWrap='wrap';actions.style.gap='6px';
  const edit=document.createElement('button');edit.className='small-btn';edit.type='button';edit.textContent='Edit';
  edit.onclick=async()=>{
   const name=prompt('विद्यार्थी का पूरा नाम:',p.full_name||'');if(name===null)return;
   const phone=prompt('मोबाइल नंबर:',p.phone||'');if(phone===null)return;
   const board=prompt('Board (Bihar Board / CBSE Board / ICSE Board / Other State Boards):',p.board||'');if(board===null)return;
   const cls=prompt('Class / Semester:',p.class_level||'');if(cls===null)return;
   const medium=prompt('Medium (Hindi / English / Urdu / Both):',p.medium||'');if(medium===null)return;
   const {error:updateError}=await sb.from('profiles').update({full_name:name.trim(),phone:phone.trim(),board:board.trim()||null,class_level:cls.trim()||null,medium:medium.trim()||null}).eq('id',p.id);
   if(updateError){alert('Update नहीं हुआ: '+updateError.message);return;}alert('विद्यार्थी का विवरण अपडेट हो गया।');await loadStudentDirectory();
  };
  const toggle=document.createElement('button');toggle.className=p.role==='disabled'?'small-btn':'delete-btn';toggle.type='button';toggle.textContent=p.role==='disabled'?'Enable':'Delete Student';
  toggle.onclick=async()=>{
   const disabling=p.role!=='disabled';
   const msg=disabling?'इस विद्यार्थी का Login बंद करें? पुराने Test Results और Certificates सुरक्षित रहेंगे।':'इस विद्यार्थी का Login फिर से चालू करें?';
   if(!confirm(msg))return;
   const {error:updateError}=await sb.from('profiles').update({role:disabling?'disabled':'student'}).eq('id',p.id);
   if(updateError){alert('स्थिति नहीं बदली: '+updateError.message);return;}
   alert(disabling?'विद्यार्थी का Login बंद कर दिया गया। पुराने रिकॉर्ड सुरक्षित हैं।':'विद्यार्थी का Login चालू कर दिया गया।');await loadStudentDirectory();
  };
  actions.append(edit,toggle);row.append(info,actions);box.append(row);
 }
}
$('studentSearchBtn').addEventListener('click',loadStudentDirectory);
$('studentSearch').addEventListener('keydown',e=>{if(e.key==='Enter')loadStudentDirectory();});
const priorShowDashboard=showDashboard;
showDashboard=async()=>{await priorShowDashboard();await loadCertificateSettings();await loadStudentDirectory();};


function adminPrintCertificate(attempt,profile,quiz){
 const pct=Math.round(100*attempt.score/attempt.total_questions);
 const grade=pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=40?'D':'Needs Improvement';
 const certId='ASB-'+String(attempt.id).padStart(6,'0');
 const issued=new Date(attempt.submitted_at).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
 const w=window.open('','_blank');if(!w){alert('कृपया इस साइट के लिए pop-up अनुमति दें।');return;}
 const esc=v=>String(v||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const center=$('centerName')?.value.trim()||'Aftab Students Book';
 const contact=$('centerContactName')?.value.trim()||'Authorized Signatory';
 const address=$('centerAddress')?.value.trim()||'';
 const phone=$('centerPhone')?.value.trim()||'';
 const email=$('centerEmail')?.value.trim()||'';
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Student Achievement Certificate</title><style>'+
 '*{box-sizing:border-box}body{margin:0;padding:22px;background:#f4f1e8;color:#263247;font-family:Georgia,"Times New Roman",serif}.cert{position:relative;max-width:1050px;min-height:690px;margin:0 auto;padding:35px 64px;text-align:center;background:#fffdf7;border:12px double #b58a32;outline:2px solid #e7cf8d;outline-offset:-23px;box-shadow:0 12px 40px #47340f22;overflow:hidden}.cert-logo{width:84px;height:84px;object-fit:contain;margin:0 auto 5px;display:block}.topline{font:700 11px Arial;letter-spacing:5px;color:#8d6a26}.brand{font:700 25px Georgia;color:#7d5b1d;margin:8px 0}.rule{width:150px;height:2px;background:#b58a32;margin:12px auto}.cert h1{font:700 42px Georgia;color:#9a7428;margin:12px 0 5px}.subtitle{font:italic 17px Georgia;color:#657080}.present{margin:22px 0 10px;font:italic 17px Georgia;color:#596579}.name{display:inline-block;min-width:360px;padding:7px 25px 12px;border-bottom:2px solid #c19a48;font:700 34px Georgia;color:#263247}.description{font:16px Georgia;color:#596579;margin:20px 0 8px}.test{font:700 23px Georgia;color:#34445d;margin:10px 0}.score{display:inline-block;margin:14px auto 8px;padding:12px 25px;border:1px solid #d5bd82;background:#fffaf0;font:700 17px Arial;color:#75591e}.certid{font:12px Arial;color:#7b8491;letter-spacing:1px;margin-top:12px}.seal{width:78px;height:78px;border:3px double #b58a32;border-radius:50%;display:grid;place-items:center;margin:12px auto 0;color:#987225;font:700 10px Arial}.footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px;font:12px Arial;color:#526075}.sign{min-width:210px;text-align:center}.signature-word{font:italic bold 42px "Brush Script MT","Segoe Script",cursive;color:#173b70;transform:rotate(-8deg)}.signline{border-top:1px solid #8e7950;padding-top:7px;margin-top:5px;font-weight:bold}.address{font:11px Arial;color:#7b8491;margin-top:15px;line-height:1.6}.printbar{text-align:center;margin:18px}.printbar button{border:0;border-radius:7px;background:#8c6825;color:white;padding:11px 22px;font-weight:bold;cursor:pointer}@page{size:A4 landscape;margin:10mm}@media print{body{padding:0;background:white}.cert{max-width:none;min-height:180mm;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}.printbar{display:none}}</style></head><body><div class="cert"><img class="cert-logo" src="assets/aftab-students-book-logo.svg" alt="Aftab Students Book"><div class="topline">CERTIFICATE OF ACHIEVEMENT</div><div class="brand">'+esc(center)+'</div><div class="rule"></div><h1>Certificate</h1><div class="subtitle">of Academic Excellence</div><p class="present">This certificate is proudly presented to</p><div class="name">'+esc(profile.full_name||'Student')+'</div><p class="description">For completing the following online assessment</p><div class="test">'+esc(quiz?.title||'Online MCQ Test')+'</div><div class="score">Score: '+attempt.score+'/'+attempt.total_questions+' | '+pct+'% | Grade '+grade+'</div><div class="certid">CERTIFICATE ID: '+certId+'</div><div class="seal">VERIFIED<br>ACHIEVEMENT</div><div class="footer"><div>Date of Issue<br><b>'+issued+'</b></div><div class="sign"><div class="signature-word">AFTAB</div><div class="signline">'+esc(contact)+'<br><span style="font-weight:normal">Authorized Signatory</span></div></div></div><div class="address">'+esc(address)+'<br>'+esc(phone)+' '+esc(email)+'</div></div><div class="printbar"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>');
 w.document.close();
}
