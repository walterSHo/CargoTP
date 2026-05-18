const DEFAULT_RAW_PATH = 'data/raw/Олексієнко.xlsx';
const DEFAULT_EVENT_TYPE = 'excel-uploaded';
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

function normalizeToken(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function secureEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function parseRepository(repository) {
  const value = normalizeToken(repository);
  const [owner, repo] = value.split('/');
  if (!owner || !repo) {
    throw new Error('GITHUB_REPO має бути у форматі owner/repository.');
  }
  return { owner, repo };
}

function githubPath(pathname) {
  return encodeURIComponent(pathname).replace(/%2F/g, '/');
}

function getGitHubToken(env) {
  return normalizeToken(env.GITHUB_UPLOAD_TOKEN || env.GITHUB_TOKEN);
}

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice('Bearer '.length).trim();
  return normalizeToken(request.headers.get('x-upload-token'));
}

function isAllowedIp(request, env) {
  const rawAllowlist = normalizeToken(env.UPLOAD_IP_ALLOWLIST);
  if (!rawAllowlist) return true;
  const allowed = rawAllowlist.split(',').map((value) => value.trim()).filter(Boolean);
  const requestIp = normalizeToken(request.headers.get('CF-Connecting-IP'));
  return Boolean(requestIp) && allowed.includes(requestIp);
}

function isAuthorized(request, password, env) {
  const configuredPassword = normalizeToken(env.UPLOAD_PASSWORD);
  const configuredToken = normalizeToken(env.UPLOAD_BEARER_TOKEN);
  if (!configuredPassword && !configuredToken) return false;

  const passwordHeader = normalizeToken(request.headers.get('x-upload-password'));
  const providedPassword = normalizeToken(password || passwordHeader);
  const providedToken = getBearerToken(request);

  const passwordOk = configuredPassword ? secureEqual(providedPassword, configuredPassword) : false;
  const tokenOk = configuredToken ? secureEqual(providedToken, configuredToken) : false;
  return (passwordOk || tokenOk) && isAllowedIp(request, env);
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function githubRequest(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CargoTP-Upload-Function',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers
    }
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = text ? (isJson ? JSON.parse(text) : null) : null;
  if (!response.ok) {
    const message = payload?.message || text || `Запит до GitHub API завершився помилкою ${response.status}`;
    throw new Error(message);
  }
  if (text && !isJson) {
    throw new Error(`GitHub API повернув успішну, але не-JSON відповідь (${response.status}): ${text.slice(0, 300)}`);
  }
  return payload;
}

async function getExistingSha(owner, repo, branch, rawPath, token) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${githubPath(rawPath)}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'CargoTP-Upload-Function',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (response.status === 404) return null;
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = text ? (isJson ? JSON.parse(text) : null) : null;
  if (!response.ok) {
    throw new Error(payload?.message || text || `Не вдалося прочитати поточний файл ${rawPath}`);
  }
  if (text && !isJson) {
    throw new Error(`GitHub API повернув не-JSON відповідь під час читання ${rawPath}: ${text.slice(0, 300)}`);
  }
  return payload?.sha ?? null;
}

export async function onRequestGet() {
  return json({
    ok: true,
    message: 'Використовуйте POST multipart/form-data з полем "file" і авторизацією через пароль або header.'
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!getGitHubToken(env)) {
    return json({ ok: false, error: 'Сервер не налаштований: відсутній GitHub token.' }, 500);
  }

  const hasPassword = normalizeToken(env.UPLOAD_PASSWORD);
  const hasBearerToken = normalizeToken(env.UPLOAD_BEARER_TOKEN);
  if (!hasPassword && !hasBearerToken) {
    return json({ ok: false, error: 'Сервер не налаштований: задайте UPLOAD_PASSWORD або UPLOAD_BEARER_TOKEN.' }, 500);
  }

  const formData = await request.formData();
  const password = formData.get('password');
  if (!isAuthorized(request, typeof password === 'string' ? password : '', env)) {
    return json({ ok: false, error: 'Неавторизований запит на завантаження.' }, 401);
  }

  const uploadedFile = formData.get('file');
  if (!uploadedFile || typeof uploadedFile.arrayBuffer !== 'function') {
    return json({ ok: false, error: 'У полі "file" відсутній Excel-файл.' }, 400);
  }

  const fileName = normalizeToken(uploadedFile.name || 'upload.xlsx');
  if (!/\.xlsx?$/i.test(fileName)) {
    return json({ ok: false, error: 'Дозволені лише файли .xlsx і .xls.' }, 400);
  }

  const arrayBuffer = await uploadedFile.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    return json({ ok: false, error: 'Завантажений файл порожній.' }, 400);
  }
  if (arrayBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    return json({ ok: false, error: `Файл завеликий. Ліміт: ${MAX_UPLOAD_SIZE_BYTES} байт.` }, 413);
  }

  try {
    const token = getGitHubToken(env);
    const { owner, repo } = parseRepository(env.GITHUB_REPO || env.GITHUB_REPOSITORY);
    const branch = normalizeToken(env.DEFAULT_BRANCH) || 'main';
    const rawPath = normalizeToken(env.UPLOAD_RAW_PATH) || DEFAULT_RAW_PATH;
    const sha = await getExistingSha(owner, repo, branch, rawPath, token);
    const uploadCommitMessage = normalizeToken(env.UPLOAD_COMMIT_MESSAGE) || `chore(data): upload Excel source ${new Date().toISOString().slice(0, 10)}`;

    const uploadPayload = {
      message: uploadCommitMessage,
      branch,
      content: arrayBufferToBase64(arrayBuffer),
      committer: {
        name: 'CargoTP Upload Bot',
        email: 'cargo-tp-upload-bot@users.noreply.github.com'
      },
      ...(sha ? { sha } : {})
    };

    const uploadResult = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath(rawPath)}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify(uploadPayload)
      }
    );

    const eventType = normalizeToken(env.GITHUB_DISPATCH_EVENT_TYPE) || DEFAULT_EVENT_TYPE;
    try {
      await githubRequest(`https://api.github.com/repos/${owner}/${repo}/dispatches`, token, {
        method: 'POST',
        body: JSON.stringify({
          event_type: eventType,
          client_payload: {
            branch,
            raw_path: rawPath,
            uploaded_filename: fileName,
            uploaded_commit_sha: uploadResult?.commit?.sha ?? null
          }
        })
      });
    } catch (dispatchError) {
      return json({
        ok: false,
        error: 'Excel завантажено в GitHub, але GitHub Actions не запустився автоматично.',
        nextStep: 'Запустіть workflow process-data вручну з GitHub Actions.',
        branch,
        rawPath,
        uploadedFileName: fileName,
        sourceCommitSha: uploadResult?.commit?.sha ?? null,
        details: dispatchError instanceof Error ? dispatchError.message : String(dispatchError)
      }, 502);
    }

    return json({
      ok: true,
      message: 'Excel завантажено. GitHub Actions запущено.',
      branch,
      rawPath,
      uploadedFileName: fileName,
      sizeBytes: arrayBuffer.byteLength,
      sourceCommitSha: uploadResult?.commit?.sha ?? null
    });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }, 502);
  }
}
