const grid=document.getElementById('classGrid');
const boards=['Bihar Board','CBSE Board','ICSE Board','Other State Boards'];
function renderClasses(){
 const board=document.getElementById('boardFilter').value;
 const medium=document.getElementById('mediumFilter').value;
 grid.innerHTML='';
 for(let n=1;n<=12;n++){
  const card=document.createElement('article');card.className='class-card';
  card.innerHTML=`<div class="class-num">${String(n).padStart(2,'0')}</div><h3>Class ${n}</h3><p>${board==='All'?'All Boards':board} · ${medium} Medium</p><span class="arrow">↗</span>`;
  card.addEventListener('click',()=>alert(`Class ${n} selected. Add verified ${board==='All'?'board-wise':board} study notes, books and MCQ content for this class in the content section.`));
  grid.appendChild(card);
 }
}
document.getElementById('boardFilter').addEventListener('change',renderClasses);
document.getElementById('mediumFilter').addEventListener('change',renderClasses);
renderClasses();
document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('nav').classList.toggle('open'));
document.querySelectorAll('#nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('nav').classList.remove('open')));
document.getElementById('year').textContent=new Date().getFullYear();
document.querySelectorAll('#options button').forEach(btn=>btn.addEventListener('click',()=>{
 const result=document.getElementById('quizResult');
 document.querySelectorAll('#options button').forEach(b=>{b.disabled=true;if(b.dataset.answer==='1950')b.classList.add('correct')});
 if(btn.dataset.answer==='1950') result.textContent='शाबाश! आपका उत्तर सही है।';
 else {btn.classList.add('wrong');result.textContent='सही उत्तर: 26 जनवरी 1950।';}
}));
