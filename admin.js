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
  info.append(b,sm);row.append(info);results.append(row);
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
