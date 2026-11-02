/**
 * accordion-faq: collapsible question/answer rows.
 * Each row: [question] [answer]. Rows with an empty question are dropped; a row without
 * an answer still renders (empty body). Extra cells are appended to the answer.
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [label, ...rest] = [...row.children];
    if (!label || !label.textContent.trim()) {
      row.remove();
      return;
    }

    const summary = document.createElement('summary');
    summary.className = 'accordion-faq-item-label';
    const question = document.createElement('span');
    question.className = 'accordion-faq-item-question';
    // keep inline markup, unwrap a single paragraph/heading
    const only = label.children.length === 1 ? label.firstElementChild : null;
    question.append(...(only && /^(P|H[1-6])$/.test(only.tagName) ? only.childNodes : label.childNodes));
    summary.append(question);

    const body = document.createElement('div');
    body.className = 'accordion-faq-item-body';
    rest.forEach((cell) => body.append(...cell.childNodes));

    const details = document.createElement('details');
    details.className = 'accordion-faq-item';
    details.append(summary, body);
    row.replaceWith(details);
  });
}
