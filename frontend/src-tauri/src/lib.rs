#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // In release mode, start the Python backend as a sidecar process
            // In debug mode, the backend should be started manually
            #[cfg(not(debug_assertions))]
            {
                use tauri_plugin_shell::ShellExt;
                let shell = app.shell();
                match shell.sidecar("binaries/backend") {
                    Ok(sidecar) => {
                        match sidecar.spawn() {
                            Ok((_rx, _child)) => {
                                log::info!("Backend sidecar started successfully");
                            }
                            Err(e) => {
                                log::error!("Failed to start backend sidecar: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to create sidecar command: {}", e);
                    }
                }
            }

            #[cfg(debug_assertions)]
            {
                log::info!("Debug mode: backend should be started manually with 'uvicorn app.main:app --reload'");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
