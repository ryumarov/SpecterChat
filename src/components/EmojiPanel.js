export function createEmojiPanel(onEmojiSelect) {
  const container = document.createElement('div');
  container.className = 'emoji-panel';
  
  const emojis = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌',
    '😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸',
    '🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢',
    '😭','😮‍💨','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🫣',
    '❤️','🔥','👍','👎','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿'
  ];
  
  const grid = document.createElement('div');
  grid.className = 'emoji-grid';
  
  emojis.forEach(emoji => {
    const el = document.createElement('div');
    el.className = 'emoji-item';
    el.textContent = emoji;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onEmojiSelect(emoji);
    });
    grid.appendChild(el);
  });
  
  container.appendChild(grid);
  return container;
}
