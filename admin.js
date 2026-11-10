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
