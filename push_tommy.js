require('dotenv').config();
const GITHUB_PAT = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'skywalker-gh/NOVA-META-Edition';

async function enablePages() {
  const [owner, repo] = REPO.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/pages`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_PAT}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: { branch: 'main', path: '/' }
    })
  });
  
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text.slice(0,500));
  
  if (res.ok) {
    console.log(`\n✅ GitHub Pages aktiviert!`);
    console.log(`Tommy Portal: https://skywalker-gh.github.io/NOVA-META-Edition/tommy/`);
  } else if (res.status === 409) {
    console.log(`\n⚠️ Pages schon aktiviert - Link: https://skywalker-gh.github.io/NOVA-META-Edition/tommy/`);
  }
}

enablePages();