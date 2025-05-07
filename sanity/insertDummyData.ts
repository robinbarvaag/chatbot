import { sanityClient } from './client';

async function fetchDummyArticles(limit = 10) {

  const res = await fetch(`https://no.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=${limit}&format=json&origin=*`);
  const data = await res.json();
  const titles = data.query.random.map((item: any) => item.title);

  const articles = [];
  for (const title of titles) {
    const contentRes = await fetch(`https://no.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(title)}&format=json&origin=*`);
    const contentData = await contentRes.json();
    const page = Object.values(contentData.query.pages)[0] as any;
    if (page && page.extract) {
      articles.push({
        _type: 'article',
        title,
        body: page.extract,
        sourceId: page.pageid,
      });
    }
  }
  return articles;
}


async function insertDummyData() {
  const dummyArticles = await fetchDummyArticles(15);

  for (const article of dummyArticles) {
    const existing = await sanityClient.fetch(
      `*[_type == "article" && title == $title][0]{_id}`,
      { title: article.title }
    );
    if (existing) {
      console.log(`Hopper over (finnes fra før): ${article.title}`);
      continue;
    }
    try {
      const res = await sanityClient.create(article);
      console.log('Opprettet:', res._id, article.title);
    } catch (e) {
      console.error('Feil ved oppretting:', e);
    }
  }
}

insertDummyData();
