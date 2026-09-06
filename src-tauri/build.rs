fn main() {
    let sec_file = std::path::Path::new("src/engine_sec.rs");
    if !sec_file.exists() {
        std::fs::write(
            sec_file,
            "pub fn get_key(_: &str) -> Result<String, String> {\n    Err(\"Mori Engine: Native security module missing in public repository tree.\".into())\n}\n",
        ).ok();
    }
    tauri_build::build()
}
