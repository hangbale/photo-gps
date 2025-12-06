import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import "./App.css";
import {
  getStore
} from "./store";
import { loadAmapScript } from "./amp";
import ApiSetting from "./api-setting";
import ImgList from "./img-list";
import loadAmp from "./amp-loader";
function App() {
  const [marker, setMarker] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [listSelectedPaths, setListSelectedPaths] = useState(new Set());
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [writeResult, setWriteResult] = useState(null);
  let [showApiSetting, setShowApiSetting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isResultPanelExpanded, setIsResultPanelExpanded] = useState(true);
  const markerRef = useRef(null);
  const currentApiKey = useRef(null);
  const currentMap = useRef(null);
  const currentAMap = useRef(null);
  const placeSearchRef = useRef(null);
  const imgGpsMarkerRef = useRef(null);

  // 当图片列表为空时，清空选中状态（解决ImgList卸载后无法同步状态的问题）
  useEffect(() => {
    if (selectedImages.length === 0) {
      setListSelectedPaths(new Set());
    }
  }, [selectedImages]);

  async function handleAddImages() {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff']
        }]
      });

      if (selected) {
        let files = Array.isArray(selected) ? selected : [selected];
        files = files.filter(file => !selectedImages.includes(file));
        files = files.map(file => ({ file_path: file, success: undefined }));
        setSelectedImages(prev => [...prev, ...files]);
        console.log('选择的图片:', files);
      }
    } catch (error) {
      console.error('选择文件时出错:', error);
    }
  }
  function getGps(file_path) {
    invoke('read_gps_from_image', { imagePath: file_path }).then(res => {
      if (res) {
        console.log(res)
        const [longitude, latitude] = res;
        // 如果已有图钉，先移除
        if (imgGpsMarkerRef.current) {
          currentMap.current.remove(imgGpsMarkerRef.current);
        }

        // 创建新图钉标记 用其他颜色区分
        let AMap = currentAMap.current;
        let newMarker = new AMap.Marker({
          position: new AMap.LngLat(longitude, latitude),
          icon: new AMap.Icon({
            size: new AMap.Size(25, 34),
            image: "/poi-marker-default.png",
            imageOffset: new AMap.Pixel(0, 0),
            imageSize: new AMap.Size(25, 34)
          }),
          title: `经度: ${longitude.toFixed(6)}, 纬度: ${latitude.toFixed(6)}`
        });
        // 放大地图到该坐标
        currentMap.current.setZoomAndCenter(15, new AMap.LngLat(longitude, latitude));
        // 将标记添加到地图

        currentMap.current.add(newMarker);

        imgGpsMarkerRef.current = newMarker;
        // 为标记添加点击事件显示信息窗体
      } else {
        console.log(`图片 ${file_path} 不包含 GPS 坐标`);
      }
    }).catch(err => {
      console.error('读取图片 GPS 坐标时出错:', err);
    });
  }

  async function writeGpsCoordinates() {
    const targetImages = selectedImages.filter((img) => listSelectedPaths.has(img.file_path));

    if (targetImages.length === 0) {
      console.log('没有选择图片');
      return;
    }

    if (!marker) {
      console.log('没有选择坐标');
      alert('请先在地图上点击选择坐标位置');
      return;
    }

    try {
      const result = await invoke('write_gps_to_images', {
        imagePaths: targetImages.map(i => i.file_path),
        longitude: parseFloat(marker.lng),
        latitude: parseFloat(marker.lat)
      });

      console.log('写入结果:', result);
      let tmp = selectedImages.slice()
      tmp.forEach(i => {
        let item = result.find(r => r.file_path === i.file_path)
        if (item) {
          i.success = item.success
        }
      })
      setSelectedImages(tmp)
      setWriteResult(result);
      setShowResultDialog(true);
    } catch (error) {
      console.error('写入GPS坐标时出错:', error);
      alert('写入失败: ' + error);
    }
  }

  const closeResultDialog = () => {
    setShowResultDialog(false);
    setWriteResult(null);
  };

  const getResultMessage = () => {
    if (!writeResult) return '';

    let success_count = writeResult.filter(r => r.success).length;
    let total_count = writeResult.length;

    if (success_count === total_count) {
      return '全部写入成功！';
    } else if (success_count === 0) {
      return '全部写入失败！';
    } else {
      return `部分写入失败！成功 ${success_count}/${total_count} 张图片`;
    }
  };

  const getResultIcon = () => {
    if (!writeResult) return null;

    let success_count = writeResult.filter(r => r.success).length;
    let total_count = writeResult.length;
    if (success_count === total_count) {
      return (
        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (success_count === 0) {
      return (
        <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
  };
  function initMap(AMap) {
    currentAMap.current = AMap;
    let map = new AMap.Map("map-container", {
      resizeEnable: true
    });
    currentMap.current = map;

    map.plugin(["AMap.ToolBar", "AMap.PlaceSearch"], function () {
      map.addControl(new AMap.ToolBar());
      const placeSearch = new AMap.PlaceSearch({
        pageSize: 5, //单页显示结果条数
        pageIndex: 1, //页码
        map: map, //展现结果的地图实例
        city: '全国',
        panel: 'amp-search-result-panel',
        autoFitView: true, //是否自动调整地图视野使绘制的 Marker 点都处于视口的可见范围
      });
      placeSearchRef.current = placeSearch;
      // placeSearch.search('上海', function (status, result) {
      //   console.log('默认搜索结果:', status, result);
      // });
    });

    map.on('click', function (e) {
      let lng = e.lnglat.getLng();
      let lat = e.lnglat.getLat();

      // 如果已有图钉，先移除
      if (markerRef.current) {
        map.remove(markerRef.current.marker);
      }

      // 创建新图钉标记
      let newMarker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        icon: new AMap.Icon({
          size: new AMap.Size(25, 34),
          image: "/poi-marker-red.png",
          imageOffset: new AMap.Pixel(0, 0),
          imageSize: new AMap.Size(25, 34)
        }),
        title: `经度: ${lng.toFixed(6)}, 纬度: ${lat.toFixed(6)}`
      });

      // 将标记添加到地图
      map.add(newMarker);

      // 为标记添加点击事件显示信息窗体
      newMarker.on('click', function () {
        let infoWindow = new AMap.InfoWindow({
          content: `<p>经度: ${lng.toFixed(6)}</p><p>纬度: ${lat.toFixed(6)}</p>`,
          offset: new AMap.Pixel(0, -34)
        });
        infoWindow.open(map, newMarker.getPosition());
      });

      // 创建标记数据对象
      const markerData = {
        lng: lng.toFixed(6),
        lat: lat.toFixed(6),
        marker: newMarker
      };

      // 更新 ref 和状态
      markerRef.current = markerData;
      setMarker(markerData);

      console.log(`图钉位置更新 - 经度: ${lng.toFixed(6)}, 纬度: ${lat.toFixed(6)}`);
    });
  }

  const handleSearch = () => {
    if (placeSearchRef.current && searchText) {
      // setIsResultPanelExpanded(true);
      placeSearchRef.current.search(searchText);
    }
  };

  useEffect(function () {
    getStore().get('amap_security_key').then(securityKey => {
      if (securityKey) {
        getStore().get('amap_api_key').then(res => {
          if (res) {
            currentApiKey.current = res;
            // loadAmapScript(res, securityKey).then(e => {
            //   initMap();
            // })
            loadAmp(res, securityKey).then((AMap) => {
              initMap(AMap);
            })
          } else {
            setShowApiSetting(true);
          }
        }).catch(err => {
          console.error('Error loading AMap script:', err);
          alert('数据存储组件异常', JSON.stringify(err));
        })
      } else {
        setShowApiSetting(true);
      }
    }).catch(err => {
      alert('数据存储组件异常', JSON.stringify(err));
    })

  }, []);

  // 删除选中的图片 (支持单个或批量)
  const handleRemoveImage = (paths) => {
    const pathsSet = new Set(Array.isArray(paths) ? paths : [paths]);
    setSelectedImages(prev => prev.filter((item) => !pathsSet.has(item.file_path)));
  };

  // 清空所有图片
  const handleClearAllImages = () => {
    setSelectedImages([]);
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* 结果提示弹窗 */}
      {showResultDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-500">
          <div className="p-8 shadow-xl rounded-xl bg-white w-96 border border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100">
                  {getResultIcon()}
                </div>
                <p className="text-lg text-gray-900 font-semibold">
                  {getResultMessage()}
                </p>
              </div>

              <button
                onClick={closeResultDialog}
                className="w-full px-6 py-3 bg-gray-900 text-white text-base font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 pt-2 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">照片地理标记</h1>
            </div>
            <button
              onClick={() => {
                setShowApiSetting(!showApiSetting)
              }}
              className="p-2 text-gray-700  rounded-lg hover:bg-gray-200 transition-colors"
              title="设置"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-61px)]">
        {/* 左侧边栏 */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddImages}
                className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
              >
                添加图片
              </button>
            </div>
          </div>



          {/* 图片列表区域 - 使用新组件 */}
          <div className="flex-1 min-h-0 relative">
            {selectedImages.length > 0 ? (
              <ImgList
                images={selectedImages}
                onRemove={handleRemoveImage}
                onItemClick={(path) => getGps(path)}
                onSelectionChange={setListSelectedPaths}
              />
            ) : (
              <div className="text-center py-12">
                <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500">暂无图片</p>
                <p className="text-xs text-gray-400 mt-1">点击"添加图片"开始使用</p>
              </div>
            )}
          </div>

          {/* 底部操作按钮 */}
          <div className="p-6 border-t border-gray-100">
            <button
              type="button"
              onClick={writeGpsCoordinates}
              disabled={listSelectedPaths.size === 0 || !marker}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${listSelectedPaths.size === 0 || !marker
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500'
                }`}
            >
              写入地理坐标 {listSelectedPaths.size > 0 ? `(${listSelectedPaths.size})` : ''}
            </button>
          </div>
        </div>

        {/* 右侧地图区域 */}
        <div className="flex-1 relative bg-gray-100">
          {/* 搜索框 */}
          <div className="absolute top-4 right-4 z-50 flex gap-0 shadow-sm rounded-lg">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索地点..."
              className="w-64 px-4 py-2.5 bg-white border border-gray-200 rounded-l-lg text-sm focus:outline-none focus:border-gray-900 z-10"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 bg-gray-900 text-white border border-gray-900 rounded-r-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <div className={`absolute top-16 right-4 z-40 w-77 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ${searchText ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
            <div
              className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsResultPanelExpanded(!isResultPanelExpanded)}
            >
              <span className="text-xs font-medium text-gray-600">搜索结果</span>
              <button className="text-gray-500 hover:text-gray-700 focus:outline-none">
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${isResultPanelExpanded ? 'rotate-180' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className={`transition-all duration-300 ease-in-out ${isResultPanelExpanded ? 'max-h-[60vh]' : 'max-h-0'}`}>
              <div id="amp-search-result-panel" className="max-h-[60vh] overflow-y-auto"></div>
            </div>
          </div>

          <div id="map-container" className="absolute inset-0"></div>

          {showApiSetting && (
            <div className="absolute inset-0 z-999 bg-gray-50 flex items-center justify-center p-8 z-10">
              <div className="w-full max-w-md">
                <ApiSetting onStatus={(apiKey, securityKey) => {
                  if (apiKey && securityKey) {
                    currentApiKey.current = apiKey;
                    setShowApiSetting(false);
                    if (currentMap.current) {
                      currentMap.current.destroy();
                    }
                    
                    currentMap.current = null;
                    placeSearchRef.current = null;
                    loadAmp(apiKey, securityKey).then((AMap) => {
                      initMap(AMap);
                    })
                  }
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
