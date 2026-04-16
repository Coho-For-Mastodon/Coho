import { marked } from 'marked';

onmessage = async (e) => {
  const markdownString = e.data;

  const parsed = await marked.parse(markdownString);

  postMessage(parsed);
};
