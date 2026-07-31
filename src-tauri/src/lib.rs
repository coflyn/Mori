use std::collections::HashMap;

#[tauri::command]
async fn tauri_http_request(
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    let m = method.unwrap_or_else(|| "GET".to_string()).to_uppercase();
    let mut req = match m.as_str() {
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => client.get(&url),
    };

    if let Some(hdrs) = headers {
        for (k, v) in hdrs {
            req = req.header(k, v);
        }
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16();

    let mut res_headers = HashMap::new();
    for (k, v) in res.headers() {
        if let Ok(v_str) = v.to_str() {
            res_headers.insert(k.as_str().to_string(), v_str.to_string());
        }
    }

    let text = res.text().await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "status": status,
        "headers": res_headers,
        "data": text
    }))
}

#[tauri::command]
async fn tauri_download_file(
    url: String,
    filename: String,
    folder: Option<String>,
    headers: Option<HashMap<String, String>>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&url);

    if let Some(hdrs) = headers {
        for (k, v) in hdrs {
            req = req.header(k, v);
        }
    }

    let res = req.send().await.map_err(|e| format!("Network error: {}", e))?;
    if !res.status().is_success() {
        return Err(format!("HTTP error {}", res.status()));
    }

    let bytes = res.bytes().await.map_err(|e| format!("Download body error: {}", e))?;

    let download_dir = dirs::download_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let mut target_dir = download_dir.join("Mori");

    if let Some(f) = folder {
        if !f.trim().is_empty() {
            target_dir = target_dir.join(f);
        }
    }

    std::fs::create_dir_all(&target_dir).map_err(|e| format!("Directory error: {}", e))?;
    let target_file = target_dir.join(&filename);

    std::fs::write(&target_file, &bytes).map_err(|e| format!("File write error: {}", e))?;

    Ok(serde_json::json!({
        "status": true,
        "path": target_file.to_string_lossy(),
        "uri": format!("file://{}", target_file.to_string_lossy())
    }))
}

#[tauri::command]
async fn tauri_read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    let mut clean_path = path.as_str();
    if clean_path.starts_with("file:///") {
        clean_path = &clean_path[8..];
    } else if clean_path.starts_with("file://") {
        clean_path = &clean_path[7..];
    }
    std::fs::read(clean_path)
        .or_else(|_| std::fs::read(clean_path.trim_start_matches('/')))
        .map_err(|e| format!("Read file error: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![tauri_http_request, tauri_download_file, tauri_read_file_bytes])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
