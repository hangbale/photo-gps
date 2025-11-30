// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod coord;
mod utils;
mod write;
mod read;


#[tauri::command]
fn write_gps_to_images(image_paths: Vec<String>, longitude: f64, latitude: f64) -> Vec<write::WriteResult> {
    println!("写入 GPS 坐标到图片:");
    println!("经度: {}, 纬度: {}", longitude, latitude);
    println!("图片路径: {:?}", image_paths);

    let results = write::write_exif_data(image_paths, (longitude, latitude));
    results
}
#[tauri::command]
fn read_gps_from_image(image_path: String) -> Option<(f64, f64)> {
    println!("读取图片的 GPS 坐标:");
    println!("图片路径: {}", image_path);
    
    let coords = read::get_gps_from_image(&image_path);
    coords
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![write_gps_to_images, read_gps_from_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
