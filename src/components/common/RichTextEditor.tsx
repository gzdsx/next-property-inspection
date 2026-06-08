'use client';

import {useCallback, useState} from 'react';
import {useEditor, EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import {Button, Tooltip} from 'antd';
import {
    BoldOutlined,
    ItalicOutlined,
    OrderedListOutlined,
    UnorderedListOutlined,
    UndoOutlined,
    RedoOutlined,
    LinkOutlined,
    PictureOutlined,
    LineOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    AlignLeftOutlined,
    AlignCenterOutlined,
    AlignRightOutlined,
    MenuOutlined,
} from '@ant-design/icons';
import {useMediaLibrary} from "@/contexts/BackendAppContext";

interface RichTextEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    placeholder?: string;
    height?: number | string;
}

export default function RichTextEditor({value = '', onChange, placeholder, height}: RichTextEditorProps) {
    const mediaLibrary = useMediaLibrary();
    const [isFullscreen, setIsFullscreen] = useState(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {levels: [1, 2, 3]},
                link: false,
            }),
            Placeholder.configure({
                placeholder: placeholder || '',
            }),
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {rel: 'noopener noreferrer', target: '_blank'},
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        onUpdate: ({editor}) => {
            onChange?.(editor.getHTML());
        },
    });

    const handleInsertImage = useCallback(() => {
        mediaLibrary.open({
            multiple: true,
            onSelect: (medias: { src?: string }[]) => {
                if (editor) {
                    medias.forEach((media) => {
                        if (media?.src) {
                            editor.chain().focus().setImage({src: media.src}).run();
                        }
                    });
                }
            },
        });
    }, [editor, mediaLibrary]);

    const handleInsertLink = useCallback(() => {
        if (!editor) return;
        const prev = editor.getAttributes('link').href;
        const url = window.prompt('URL', prev);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({href: url}).run();
    }, [editor]);

    if (!editor) return null;

    const toolbarButton = (
        icon: React.ReactNode,
        title: string,
        onClick: () => void,
        active?: boolean,
    ) => (
        <Tooltip title={title}>
            <Button
                type={active ? 'primary' : 'text'}
                size="small"
                icon={icon}
                onClick={onClick}
                style={{minWidth: 28}}
            />
        </Tooltip>
    );

    return (
        <div style={{
            border: '1px solid #d9d9d9',
            borderRadius: isFullscreen ? 0 : 6,
            overflow: 'hidden',
            ...(isFullscreen && {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                backgroundColor: '#fff',
            })
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '6px 8px',
                borderBottom: '1px solid #f0f0f0',
                flexWrap: 'wrap',
            }}>
                {toolbarButton(<UndoOutlined/>, 'Undo', () => editor.chain().focus().undo().run(),
                    !editor.can().undo())}
                {toolbarButton(<RedoOutlined/>, 'Redo', () => editor.chain().focus().redo().run(),
                    !editor.can().redo())}

                <span style={{
                    display: 'inline-block',
                    width: 1,
                    height: 14,
                    margin: '0 4px',
                    backgroundColor: '#d9d9d9',
                    verticalAlign: 'middle'
                }}/>

                {toolbarButton(<BoldOutlined/>, 'Bold', () => editor.chain().focus().toggleBold().run(),
                    editor.isActive('bold'))}
                {toolbarButton(<ItalicOutlined/>, 'Italic', () => editor.chain().focus().toggleItalic().run(),
                    editor.isActive('italic'))}

                <span style={{
                    display: 'inline-block',
                    width: 1,
                    height: 14,
                    margin: '0 4px',
                    backgroundColor: '#d9d9d9',
                    verticalAlign: 'middle'
                }}/>

                {toolbarButton(<span style={{fontWeight: 700, fontSize: 14}}>H1</span>, 'Heading 1',
                    () => editor.chain().focus().toggleHeading({level: 1}).run(), editor.isActive('heading', {level: 1}))}
                {toolbarButton(<span style={{fontWeight: 700, fontSize: 13}}>H2</span>, 'Heading 2',
                    () => editor.chain().focus().toggleHeading({level: 2}).run(), editor.isActive('heading', {level: 2}))}
                {toolbarButton(<span style={{fontWeight: 700, fontSize: 12}}>H3</span>, 'Heading 3',
                    () => editor.chain().focus().toggleHeading({level: 3}).run(), editor.isActive('heading', {level: 3}))}

                <span style={{
                    display: 'inline-block',
                    width: 1,
                    height: 14,
                    margin: '0 4px',
                    backgroundColor: '#d9d9d9',
                    verticalAlign: 'middle'
                }}/>

                {toolbarButton(<UnorderedListOutlined/>, 'Bullet List',
                    () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
                {toolbarButton(<OrderedListOutlined/>, 'Ordered List',
                    () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}

                <span style={{
                    display: 'inline-block',
                    width: 1,
                    height: 14,
                    margin: '0 4px',
                    backgroundColor: '#d9d9d9',
                    verticalAlign: 'middle'
                }}/>

                {toolbarButton(<AlignLeftOutlined/>, 'Align Left',
                    () => editor.chain().focus().setTextAlign('left').run(),
                    editor.isActive({textAlign: 'left'}))}
                {toolbarButton(<AlignCenterOutlined/>, 'Align Center',
                    () => editor.chain().focus().setTextAlign('center').run(),
                    editor.isActive({textAlign: 'center'}))}
                {toolbarButton(<AlignRightOutlined/>, 'Align Right',
                    () => editor.chain().focus().setTextAlign('right').run(),
                    editor.isActive({textAlign: 'right'}))}
                {toolbarButton(<MenuOutlined/>, 'Align Justify',
                    () => editor.chain().focus().setTextAlign('justify').run(),
                    editor.isActive({textAlign: 'justify'}))}

                <span style={{
                    display: 'inline-block',
                    width: 1,
                    height: 14,
                    margin: '0 4px',
                    backgroundColor: '#d9d9d9',
                    verticalAlign: 'middle'
                }}/>

                {toolbarButton(<LinkOutlined/>, 'Insert Link', handleInsertLink,
                    editor.isActive('link'))}
                {toolbarButton(<PictureOutlined/>, 'Insert Image', handleInsertImage)}
                {toolbarButton(<LineOutlined/>, 'Horizontal Rule',
                    () => editor.chain().focus().setHorizontalRule().run())}

                <span style={{
                    display: 'inline-block',
                    width: 1,
                    height: 14,
                    margin: '0 4px',
                    backgroundColor: '#d9d9d9',
                    verticalAlign: 'middle'
                }}/>

                {toolbarButton(
                    isFullscreen ? <FullscreenExitOutlined/> : <FullscreenOutlined/>,
                    isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
                    () => setIsFullscreen(!isFullscreen),
                    isFullscreen
                )}
            </div>

            {/* Editor Content */}
            <EditorContent
                editor={editor}
                style={{minHeight: isFullscreen ? 'calc(100vh - 60px)' : height}}
            />
        </div>
    );
}
