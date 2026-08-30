import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const form = document.getElementById('cv-form');
const placeholder = document.getElementById('placeholder');
const result = document.getElementById('result');
const scoreElement = document.getElementById('score');
const summaryElement = document.getElementById('summary');
const feedbackText = document.getElementById('feedbackText');
const missingKeywordsList = document.getElementById('missingKeywords');
const strengthsList = document.getElementById('strengths');
const improvementsList = document.getElementById('improvements');
const themeToggle = document.getElementById('themeToggle');

const savedTheme = localStorage.getItem('cv-theme') || 'dark';
document.body.classList.toggle('dark-theme', savedTheme === 'dark');

const themeLabel = themeToggle.querySelector('.toggle-text');
const themeIcon = themeToggle.querySelector('.toggle-icon');

if (savedTheme === 'light') {
  themeLabel.textContent = 'Light';
  themeIcon.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('cv-theme', isDark ? 'dark' : 'light');
  themeLabel.textContent = isDark ? 'Dark' : 'Light';
  themeIcon.textContent = isDark ? '🌙' : '☀️';
});

const actionVerbs = [
  'led', 'built', 'managed', 'developed', 'improved', 'created', 'optimized',
  'delivered', 'designed', 'implemented', 'increased', 'reduced', 'launched',
  'trained', 'streamlined', 'analysed', 'analyzed', 'collaborated', 'mentored'
];

function setList(listElement, items) {
  listElement.innerHTML = '';

  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No feedback available yet.';
    listElement.appendChild(li);
    return;
  }

  items.forEach((itemText) => {
    const li = document.createElement('li');
    li.textContent = itemText;
    listElement.appendChild(li);
  });
}

function extractEmail(text) {
  return /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text);
}

function extractPhone(text) {
  return /(?:\+?\d[\d\s().-]{8,}\d)/.test(text);
}

function hasBullets(text) {
  return /(?:^|\n)\s*[-•*]\s+/.test(text);
}

function hasMetrics(text) {
  return /\b\d+(?:%|\+|\s*(?:years?|months?|clients?|projects?))\b/i.test(text);
}

function hasSections(text) {
  const sections = ['experience', 'education', 'skills', 'projects'];
  const lower = text.toLowerCase();
  return sections.filter((section) => lower.includes(section)).length;
}

function hasActionVerbs(text) {
  const lower = text.toLowerCase();
  return actionVerbs.filter((verb) => lower.includes(verb)).length;
}

function getMissingKeywords(jobTitle, jobDescription, cvText) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'with', 'from', 'to', 'of', 'on', 'in', 'at',
    'is', 'are', 'be', 'as', 'by', 'your', 'our', 'team', 'role', 'candidate', 'experience',
    'skills', 'work', 'job', 'resume', 'cv', 'must', 'will', 'using', 'into', 'about', 'able',
    'within', 'across', 'through'
  ]);

  const keywordSource = ((jobDescription || jobTitle || '') + ' ' + (jobTitle || '')).toLowerCase();
  const titleWords = keywordSource.match(/[a-z]+/g) || [];
  const cvWords = new Set((cvText || '').toLowerCase().match(/[a-z]+/g) || []);

  return [...new Set(titleWords.filter((word) => {
    const short = word.length <= 2;
    const common = stopWords.has(word);
    return !short && !common && !cvWords.has(word);
  }))].slice(0, 10);
}

function analyzeCV(cvText, jobTitle, jobDescription) {
  const text = (cvText || '').trim();
  const lower = text.toLowerCase();
  let score = 0;
  const strengths = [];
  const improvements = [];
  const missingKeywords = getMissingKeywords(jobTitle, jobDescription, text);

  if (!text) {
    return {
      score: 0,
      strengths: ['No CV content provided.'],
      improvements: ['Paste text or upload a PDF to get started.'],
      summary: 'Please add CV details before reviewing.',
      feedback: 'The CV is empty. Add your work history, education, and skills to receive a proper review.',
      missingKeywords
    };
  }

  if (text.split(/\s+/).length >= 120) {
    score += 15;
    strengths.push('The CV includes a strong amount of detail for recruiters to assess experience and skills.');
  } else {
    improvements.push('Add more detail describing your responsibilities, achievements, and scope of work.');
  }

  if (extractEmail(text)) {
    score += 10;
    strengths.push('Contact information is clearly included.');
  } else {
    improvements.push('Add a professional email address so recruiters can contact you easily.');
  }

  if (extractPhone(text)) {
    score += 10;
    strengths.push('A phone number is present for direct contact.');
  } else {
    improvements.push('Include a phone number if you want recruiters to reach you quickly.');
  }

  const sectionCount = hasSections(text);
  if (sectionCount >= 3) {
    score += 15;
    strengths.push('The CV has a clear structure with common resume sections.');
  } else {
    improvements.push('Organize the resume with clear sections such as Experience, Skills, Education, and Projects.');
  }

  if (hasBullets(text)) {
    score += 10;
    strengths.push('The content uses bullet points, which makes responsibilities easier to scan.');
  } else {
    improvements.push('Use bullet points to improve readability and recruiter scanning speed.');
  }

  if (hasMetrics(text)) {
    score += 15;
    strengths.push('The CV includes measurable results and makes achievements more credible.');
  } else {
    improvements.push('Add numbers, percentages, or measurable outcomes to highlight success.');
  }

  if (hasActionVerbs(text)) {
    score += 15;
    strengths.push('Strong action verbs are used to describe achievements and responsibilities.');
  } else {
    improvements.push('Use more result-driven verbs like led, built, managed, reduced, and improved.');
  }

  const jdText = (jobDescription || jobTitle || '').trim();
  if (jdText) {
    const jdWords = new Set((jdText.toLowerCase().match(/[a-z]+/g) || []));
    const overlap = [...jdWords].filter((word) => lower.includes(word)).slice(0, 5);

    if (overlap.length > 0) {
      score += 10;
      strengths.push(`The CV reflects key language from the job description: ${overlap.join(', ')}.`);
    } else {
      improvements.push('Tailor the CV more closely to the job description by matching key responsibilities, tools, and required skills.');
    }
  } else if (jobTitle) {
    const titleWords = new Set((jobTitle.toLowerCase().match(/[a-z]+/g) || []));
    const cvWords = new Set((lower.match(/[a-z]+/g) || []));
    const overlap = [...titleWords].filter((word) => cvWords.has(word)).slice(0, 5);

    if (overlap.length > 0) {
      score += 10;
      strengths.push(`The CV reflects keywords related to the target role: ${overlap.join(', ')}.`);
    } else {
      improvements.push('Tailor the CV more closely to the role by matching keywords from the target job title.');
    }
  }

  if (text.split(/\s+/).length < 180) {
    improvements.push('Expand the CV with a few more accomplishments to make it more compelling.');
  }

  score = Math.max(0, Math.min(100, score));

  let summary = 'This CV requires a stronger employer-focused positioning and more targeted achievement statements before it can compete effectively for the role.';
  let feedback = 'From a recruiter perspective, this CV would benefit from clearer business impact, stronger alignment to the job specification, and more role-specific language that reflects the target position.';

  if (score >= 80) {
    summary = 'This CV is well-structured and presents a convincing profile. It is competitive for the market and would benefit from final role-specific refinements.';
    feedback = 'This profile is strong from a hiring perspective. It demonstrates relevant experience and clear value, but should continue to reflect the exact role language and priorities of the target employer.';
  } else if (score >= 60) {
    summary = 'This CV is solid and credible, but it would be more effective with sharper job alignment and stronger measurable outcomes.';
    feedback = 'Recruiters would view this as a promising candidate profile, though slightly stronger keyword alignment and measurable achievement framing would improve shortlist potential.';
  }

  if (missingKeywords.length > 0) {
    feedback += ` Missing keywords include: ${missingKeywords.join(', ')}.`;
  } else {
    feedback += ' The CV already reflects the important keywords for the target role.';
  }

  return { score, strengths, improvements, summary, feedback, missingKeywords };
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    text += ` ${pageText}`;
  }

  return text.trim();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const fileInput = document.getElementById('cvFile');
  const textArea = document.getElementById('cvText');
  const nameInput = document.getElementById('name');
  const jobInput = document.getElementById('jobTitle');
  const jobDescriptionInput = document.getElementById('jobDescription');
  const jobDescriptionFileInput = document.getElementById('jobDescriptionFile');

  const name = nameInput.value.trim() || 'Candidate';
  const jobTitle = jobInput.value.trim() || 'General role';
  const file = fileInput.files && fileInput.files[0];
  let cvText = textArea.value.trim();
  let jobDescription = jobDescriptionInput.value.trim();

  try {
    if (file) {
      cvText = await extractTextFromPdf(file);
    }

    if (jobDescriptionFileInput.files && jobDescriptionFileInput.files[0]) {
      const jdFile = jobDescriptionFileInput.files[0];
      if (jdFile.name.toLowerCase().endsWith('.pdf')) {
        jobDescription = await extractTextFromPdf(jdFile);
      } else {
        jobDescription = await jdFile.text();
      }
    }

    if (!cvText) {
      throw new Error('Please paste text or upload a PDF before submitting.');
    }

    const analysis = analyzeCV(cvText, jobTitle, jobDescription);
    placeholder.classList.add('hidden');
    result.classList.remove('hidden');

    scoreElement.textContent = analysis.score;
    summaryElement.textContent = analysis.summary;
    feedbackText.textContent = analysis.feedback;
    setList(missingKeywordsList, analysis.missingKeywords.length ? analysis.missingKeywords.map((keyword) => keyword.replace(/^./, (c) => c.toUpperCase())) : ['No important missing keywords found.']);
    setList(strengthsList, analysis.strengths);
    setList(improvementsList, analysis.improvements);

    console.log(`Reviewed ${name}'s CV for ${jobTitle}`);
  } catch (error) {
    placeholder.classList.remove('hidden');
    result.classList.add('hidden');
    placeholder.innerHTML = `
      <h2>Review error</h2>
      <p>${error.message}</p>
    `;
  }
});
