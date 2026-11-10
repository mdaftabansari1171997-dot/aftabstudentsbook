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
function showDashboard(profile){$('loginBox').hidden=true;$('studentDashboard').hidden=false;$('welcomeName').textContent=profile.name||'Student';$('profileName').textContent=profile.name||'—';$('profileMobile').textContent=profile.phone||'—';$('profileMobile2').textContent=profile.phone||'—';}
(async()=>{const {data:{user}}=await sb.auth.getUser();if(user){const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(data)showDashboard({name:data.full_name,phone:data.phone});}})();
