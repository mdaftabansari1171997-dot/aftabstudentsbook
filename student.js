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
['studentBoardFilter','studentClassFilter','studentLanguageFilter'].forEach(id=>$(id).addEventListener('change',()=>{updateSelectedLabel();loadMaterials();}));
(async()=>{
 const {data:{user},error}=await sb.auth.getUser();if(error)return;
 if(user){const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(data)showDashboard({name:data.full_name,phone:data.phone});}
})();
