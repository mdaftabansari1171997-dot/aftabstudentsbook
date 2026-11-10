const $=id=>document.getElementById(id);const sb=window.aftabSupabase;
$('mobileForm').addEventListener('submit',async e=>{
 e.preventDefault();const name=$('studentName').value.trim(),phone=$('mobile').value.trim();
 if(!/^[6-9][0-9]{9}$/.test(phone)){$('studentMessage').textContent='कृपया सही 10 अंकों का भारतीय मोबाइल नंबर लिखें।';return;}
 $('studentMessage').textContent='OTP भेजा जा रहा है…';
 const {error}=await sb.auth.signInWithOtp({phone:'+91'+phone,options:{channel:'sms'}});
 if(error){$('studentMessage').textContent='OTP नहीं भेजा जा सका: '+error.message;return;}
 sessionStorage.setItem('aftab_pending_name',name);sessionStorage.setItem('aftab_pending_phone','+91'+phone);
 $('mobileForm').hidden=true;$('otpForm').hidden=false;$('studentMessage').textContent='आपके मोबाइल पर SMS OTP भेजा गया है।';
});
$('otpForm').addEventListener('submit',async e=>{
 e.preventDefault();const phone=sessionStorage.getItem('aftab_pending_phone'),name=sessionStorage.getItem('aftab_pending_name'),token=$('otp').value.trim();
 const {data,error}=await sb.auth.verifyOtp({phone,token,type:'sms'});if(error){$('studentMessage').textContent='OTP verification failed: '+error.message;return;}
 const user=data.user;const {error:profileError}=await sb.from('profiles').upsert({id:user.id,full_name:name,phone},{onConflict:'id'});
 if(profileError){$('studentMessage').textContent='Login हो गया, लेकिन profile save नहीं हुई: '+profileError.message;return;}
 showDashboard({name,phone});
});
$('backToMobile').addEventListener('click',()=>{$('otpForm').hidden=true;$('mobileForm').hidden=false;$('studentMessage').textContent='';});
$('studentLogout').addEventListener('click',async()=>{await sb.auth.signOut();$('studentDashboard').hidden=true;$('loginBox').hidden=false;$('mobileForm').reset();$('otpForm').reset();$('otpForm').hidden=true;$('mobileForm').hidden=false;$('studentMessage').textContent='आप लॉगआउट हो गए हैं।';});
async function showDashboard(profile){$('loginBox').hidden=true;$('studentDashboard').hidden=false;$('welcomeName').textContent=profile.name||'Student';$('profileName').textContent=profile.name||'—';$('profileMobile').textContent=profile.phone||'—';$('profileMobile2').textContent=profile.phone||'—';await loadMaterials();}
async function loadMaterials(){
 const box=$('studentMaterials');box.innerHTML='<p class="muted">Loading…</p>';
 let query=sb.from('study_materials').select('*').eq('is_published',true).order('created_at',{ascending:false});
 const board=$('studentBoardFilter')?.value,lang=$('studentLanguageFilter')?.value;
 if(board){query=query.or(`board.eq.${board},university.eq.${board}`);}
 if(lang)query=query.eq('language',lang);
 const {data,error}=await query;
 if(error){box.textContent='सामग्री लोड नहीं हुई: '+error.message;return;}
 box.innerHTML='';if(!data?.length){box.innerHTML='<p class="muted">अभी कोई सामग्री उपलब्ध नहीं है। Admin से सामग्री अपलोड करवाएँ।</p>';return;}
 for(const item of data){const row=document.createElement('div');row.className='resource-item';const info=document.createElement('div');const b=document.createElement('b');b.textContent=item.title;const sm=document.createElement('small');sm.textContent=[item.board,item.university,item.course,item.class_level,item.subject,item.language,item.material_type].filter(Boolean).join(' • ');info.append(b,sm);row.append(info);
 if(item.file_path){const btn=document.createElement('button');btn.textContent='Open PDF';btn.onclick=async()=>{const {data,error}=await sb.storage.from('study-pdfs').createSignedUrl(item.file_path,300);if(error)alert(error.message);else window.open(data.signedUrl,'_blank','noopener')};row.append(btn);}
 box.append(row);}
}
$('studentBoardFilter')?.addEventListener('change',loadMaterials);$('studentLanguageFilter')?.addEventListener('change',loadMaterials);
(async()=>{const {data:{user}}=await sb.auth.getUser();if(user){const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(data)showDashboard({name:data.full_name,phone:data.phone});}})();
