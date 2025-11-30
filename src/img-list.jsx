import { useState, useRef, useEffect, useMemo } from "react";
import { convertFileSrc } from '@tauri-apps/api/core';

const ITEM_HEIGHT = 74; // 列表项固定高度 (px)

export default function ImgList({ images, onRemove, onItemClick, onSelectionChange }) {
    const [selectedPaths, setSelectedPaths] = useState(new Set());
    const [previewImage, setPreviewImage] = useState(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const containerRef = useRef(null);

    // 监听容器高度变化
    useEffect(() => {
        if (containerRef.current) {
            setContainerHeight(containerRef.current.clientHeight);
            const observer = new ResizeObserver(entries => {
                setContainerHeight(entries[0].contentRect.height);
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, []);

    // 图片列表变化时，清理已不存在的选中项
    useEffect(() => {
        setSelectedPaths(prev => {
            const currentPaths = new Set(images.map(img => img.file_path));
            const newSet = new Set();
            let hasChanged = false;
            
            prev.forEach(path => {
                if (currentPaths.has(path)) {
                    newSet.add(path);
                } else {
                    hasChanged = true;
                }
            });

            // 如果选中数量变了，说明有选中的图片被删除了，更新状态
            // 如果数量没变，但images引用变了（比如添加图片），保持原样
            return hasChanged ? newSet : prev;
        });
    }, [images]);

    // 监听选中变化
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedPaths);
        }
    }, [selectedPaths, onSelectionChange]);

    const handleScroll = (e) => {
        setScrollTop(e.target.scrollTop);
    };

    // 虚拟滚动计算
    const totalHeight = images.length * ITEM_HEIGHT;
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const renderStart = Math.max(0, startIndex - 2);
    const renderEnd = Math.min(images.length, startIndex + visibleCount + 2);

    const visibleItems = useMemo(() => {
        const items = [];
        for (let i = renderStart; i < renderEnd; i++) {
            items.push({ ...images[i], top: i * ITEM_HEIGHT });
        }
        return items;
    }, [images, renderStart, renderEnd]);

    // 选择逻辑
    const toggleSelect = (path) => {
        const newSet = new Set(selectedPaths);
        if (newSet.has(path)) newSet.delete(path);
        else newSet.add(path);
        setSelectedPaths(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedPaths.size === images.length && images.length > 0) {
            setSelectedPaths(new Set());
        } else {
            setSelectedPaths(new Set(images.map((img) => img.file_path)));
        }
    };

    const handleRemoveSelected = () => {
        const pathsToRemove = Array.from(selectedPaths);
        setSelectedPaths(new Set());
        onRemove(pathsToRemove);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* 工具栏 */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 flex-none">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={images.length > 0 && selectedPaths.size === images.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-500 cursor-pointer"
                    />
                    <span className="text-xs text-gray-500">
                        全选 ({selectedPaths.size}/{images.length})
                    </span>
                </div>
                {selectedPaths.size > 0 && (
                    <button
                        type="button"
                        onClick={handleRemoveSelected}
                        className="px-3  text-gray-700 text-sm font-medium hover:text-gray-990 transition-colors"
                        title="清空所有图片"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>

                )}
            </div>

            {/* 虚拟滚动容器 */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto scrollbar-hide relative"
                onScroll={handleScroll}
            >
                <div style={{ height: totalHeight }} className="w-full">
                    {visibleItems.map((item) => (
                        <div
                            key={item.file_path}
                            style={{
                                position: 'absolute',
                                top: item.top,
                                height: ITEM_HEIGHT,
                                left: 0,
                                right: 0
                            }}
                            className={`flex items-center gap-3 px-4 border-b border-gray-50 transition-colors ${selectedPaths.has(item.file_path) ? 'bg-blue-50' : 'hover:bg-gray-50'
                                } ${item.success === false ? 'bg-red-50' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedPaths.has(item.file_path)}
                                onChange={() => toggleSelect(item.file_path)}
                                className="rounded border-gray-300 text-gray-900 focus:ring-gray-500 cursor-pointer"
                            />

                            <div
                                className="relative group cursor-zoom-in flex-none"
                                onClick={() => setPreviewImage(item.file_path)}
                            >
                                <img
                                    src={convertFileSrc(item.file_path)}
                                    alt="thumbnail"
                                    className="w-12 h-12 object-cover rounded border border-gray-200 bg-gray-100"
                                    loading="lazy"
                                />
                            </div>

                            <div
                                className="flex-1 min-w-0 cursor-pointer py-3"
                                onClick={() => onItemClick(item.file_path)}
                            >
                                <p className="font-medium text-gray-900 text-sm truncate" title={item.file_path.split('/').pop()}>
                                    {item.file_path.split('/').pop()}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-0.5" title={item.file_path}>
                                    {item.file_path.split('/').slice(-2).join('/')}
                                </p>
                            </div>

                            <button
                                onClick={() => onRemove([item.file_path])}
                                className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                                title="移除"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 图片预览弹窗 */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center  backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]">
                        <img
                            src={convertFileSrc(previewImage)}
                            className="max-w-full max-h-[90vh] rounded shadow-2xl"
                            alt="Preview"
                        />
                        <button
                            className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                            onClick={() => setPreviewImage(null)}
                        >
                            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
