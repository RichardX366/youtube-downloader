const linkInput = document.querySelector('#yt-link');
const fetchButton = document.querySelector('#fetch');
const table = document.querySelector('table');
const thumbnailImage = document.querySelector('img');
const thumbnailInput = document.querySelector('#thumbnail');
const titleInput = document.querySelector('#title');
const artistInput = document.querySelector('#artist');
const albumInput = document.querySelector('#album');
const downloadButton = document.querySelector('table button');
let loudness = 0;

const cleanFilename = (filename) => {
  return filename
    .replaceAll('/', '')
    .replaceAll('\\', '')
    .replaceAll(':', '')
    .replaceAll('*', '')
    .replaceAll('?', '')
    .replaceAll('"', '')
    .replaceAll('<', '')
    .replaceAll('>', '')
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll('|', '')
    .replaceAll('.', '_')
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
};

linkInput.focus();

fetchButton.onclick = async () => {
  const videoLink = linkInput.value;
  if (!videoLink) return;

  const response = await fetch('/info/' + encodeURIComponent(videoLink)).then(
    (res) => res.json(),
  );

  thumbnailImage.src = response.thumbnail;
  titleInput.value = response.title;
  artistInput.value = response.artist;
  albumInput.value = '';
  loudness = response.loudness;

  table.style.display = 'table';
};

thumbnailInput.onchange = () => {
  const file = thumbnailInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      thumbnailImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
};

downloadButton.onclick = async () => {
  if (confirm('Are you sure you want to download this song?')) {
    downloadButton.disabled = true;

    const canvas = new OffscreenCanvas(300, 300);
    const ctx = canvas.getContext('2d');
    const cropSize = Math.min(
      thumbnailImage.naturalWidth,
      thumbnailImage.naturalHeight,
    );
    const sx = (thumbnailImage.naturalWidth - cropSize) / 2;
    const sy = (thumbnailImage.naturalHeight - cropSize) / 2;

    ctx.drawImage(
      thumbnailImage,
      sx,
      sy,
      cropSize,
      cropSize,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise((resolve) => {
      canvas.convertToBlob({ type: 'image/jpeg' }).then((blob) => {
        resolve(blob);
      });
    });

    const formData = new FormData();
    formData.append('thumbnail', blob, 'thumbnail.jpg');
    formData.append('title', titleInput.value);
    formData.append('artist', artistInput.value);
    formData.append('album', albumInput.value);
    formData.append('loudness', loudness);

    const response = await fetch(
      '/download/' + encodeURIComponent(linkInput.value),
      {
        method: 'POST',
        body: formData,
      },
    ).then((res) => res.blob());

    const url = URL.createObjectURL(response);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanFilename(titleInput.value)}-${
      cleanFilename(artistInput.value) || 'Unknown'
    }.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    downloadButton.disabled = false;
    table.style.display = 'none';
    linkInput.value = '';
    linkInput.focus();
  }
};
