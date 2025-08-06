import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Toolbar,
  Stack,
  Button,
  CircularProgress,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github.css';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preview-tabpanel-${index}`}
      aria-labelledby={`preview-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

interface ReadmeLivePreviewProps {
  readmeContent: string;
  isGenerating: boolean;
  onRegenerate?: () => void;
  onContentChange?: (content: string) => void;
  repoName?: string;
  isEditable?: boolean;
}

const ReadmeLivePreview: React.FC<ReadmeLivePreviewProps> = ({
  readmeContent,
  isGenerating,
  onRegenerate,
  onContentChange,
  repoName,
  isEditable = true
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [editableContent, setEditableContent] = useState(readmeContent);
  const [previewWidth, setPreviewWidth] = useState(50); // Percentage
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditableContent(readmeContent);
  }, [readmeContent]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setEditableContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editableContent);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadReadme = () => {
    const blob = new Blob([editableContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${repoName || 'README'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const insertTemplate = (template: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = editableContent.substring(0, start) + template + editableContent.substring(end);
    
    setEditableContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + template.length, start + template.length);
    }, 0);
  };

  const quickTemplates = [
    { name: 'Badge', template: '[![Badge Name](https://img.shields.io/badge/label-message-blue)](https://example.com)' },
    { name: 'Code Block', template: '\n```javascript\n// Your code here\n```\n' },
    { name: 'Table', template: '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n' },
    { name: 'Image', template: '![Alt text](image-url-here)' },
    { name: 'Link', template: '[Link text](https://example.com)' },
    { name: 'List', template: '\n- Item 1\n- Item 2\n- Item 3\n' },
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: theme === 'dark' ? '#1e1e1e' : '#ffffff' }}>
      {/* Toolbar */}
      <Paper elevation={1} sx={{ borderRadius: 0 }}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            📝 README Live Preview
            {repoName && <Typography component="span" sx={{ ml: 1, color: 'text.secondary' }}>• {repoName}</Typography>}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* Font Size Control */}
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Size</InputLabel>
              <Select
                value={fontSize}
                label="Size"
                onChange={(e) => setFontSize(e.target.value as number)}
              >
                <MenuItem value={12}>12px</MenuItem>
                <MenuItem value={14}>14px</MenuItem>
                <MenuItem value={16}>16px</MenuItem>
                <MenuItem value={18}>18px</MenuItem>
              </Select>
            </FormControl>

            {/* Theme Toggle */}
            <Tooltip title="Toggle theme">
              <IconButton onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                {theme === 'light' ? '🌙' : '☀️'}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem />

            {/* Quick Actions */}
            <Tooltip title="Copy to clipboard">
              <IconButton onClick={copyToClipboard} size="small">
                📋
              </IconButton>
            </Tooltip>

            <Tooltip title="Download README.md">
              <IconButton onClick={downloadReadme} size="small">
                💾
              </IconButton>
            </Tooltip>

            {onRegenerate && (
              <Tooltip title="Regenerate README">
                <IconButton 
                  onClick={onRegenerate} 
                  size="small"
                  disabled={isGenerating}
                >
                  {isGenerating ? <CircularProgress size={16} /> : '🔄'}
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Toolbar>
      </Paper>

      {/* Tab Navigation */}
      <Paper elevation={0} sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="📝 Editor" />
          <Tab label="👀 Preview" />
          <Tab label="📑 Split View" />
        </Tabs>
      </Paper>

      {/* Quick Templates Bar */}
      {isEditable && activeTab !== 1 && (
        <Paper elevation={0} sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Typography variant="caption" sx={{ alignSelf: 'center', mr: 1 }}>
              Quick Insert:
            </Typography>
            {quickTemplates.map((template) => (
              <Button
                key={template.name}
                size="small"
                variant="outlined"
                onClick={() => insertTemplate(template.template)}
                sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '12px' }}
              >
                {template.name}
              </Button>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Editor Only */}
        <TabPanel value={activeTab} index={0}>
          {isEditable ? (
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              p: 2
            }}>
              <textarea
                ref={textareaRef}
                value={editableContent}
                onChange={handleContentChange}
                style={{
                  width: '100%',
                  flex: 1,
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.6,
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '16px',
                  resize: 'none',
                  outline: 'none',
                  overflow: 'auto',
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  boxSizing: 'border-box',
                }}
                placeholder="Start typing your README content here..."
              />
            </Box>
          ) : (
            <Box sx={{ 
              height: '100%', 
              overflow: 'auto', 
              p: 2,
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
            }}>
              <pre
                style={{
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  padding: '16px',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                }}
              >
                {editableContent}
              </pre>
            </Box>
          )}
        </TabPanel>

        {/* Preview Only */}
        <TabPanel value={activeTab} index={1}>
          <Box 
            sx={{ 
              height: '100%', 
              overflow: 'auto', 
              p: 3,
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#000000',
            }}
          >
            {isGenerating ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="400px">
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  🤖 Generating README...
                </Typography>
              </Box>
            ) : (
              <Box 
                sx={{ 
                  fontSize: `${fontSize}px`,
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    marginTop: '20px',
                    marginBottom: '10px',
                    fontWeight: 'bold',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                  },
                  '& h1': { fontSize: '2em' },
                  '& h2': { fontSize: '1.5em' },
                  '& h3': { fontSize: '1.25em' },
                  '& p': {
                    marginBottom: '12px',
                    lineHeight: 1.6,
                  },
                  '& pre': {
                    backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    overflow: 'auto',
                    border: `1px solid ${theme === 'dark' ? '#444' : '#e9ecef'}`,
                    margin: '12px 0',
                    maxWidth: '100%',
                  },
                  '& code': {
                    backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f8f9fa',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.9em',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    wordBreak: 'break-word',
                  },
                  '& blockquote': {
                    borderLeft: `4px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    paddingLeft: '12px',
                    margin: '12px 0',
                    fontStyle: 'italic',
                    color: theme === 'dark' ? '#ccc' : '#666',
                  },
                  '& ul, & ol': {
                    paddingLeft: '20px',
                    marginBottom: '12px',
                  },
                  '& li': {
                    marginBottom: '4px',
                  },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    marginBottom: '12px',
                    fontSize: '0.9em',
                  },
                  '& th, & td': {
                    border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                    padding: '6px 10px',
                    textAlign: 'left',
                  },
                  '& th': {
                    backgroundColor: theme === 'dark' ? '#333' : '#f5f5f5',
                    fontWeight: 'bold',
                  },
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    margin: '8px 0',
                  },
                  '& a': {
                    color: theme === 'dark' ? '#4fc3f7' : '#1976d2',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  },
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                >
                  {editableContent}
                </ReactMarkdown>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Split View */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
            {/* Editor Pane */}
            <Box sx={{ 
              width: `${previewWidth}%`, 
              height: '100%', 
              borderRight: 1, 
              borderColor: 'divider',
              minWidth: '300px',
              maxWidth: '70%',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Resize Handle */}
              <Box
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  backgroundColor: 'divider',
                  cursor: 'col-resize',
                  zIndex: 1000,
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = previewWidth;
                  const containerWidth = ((e.target as HTMLElement).closest('[role="tabpanel"]') as HTMLElement)?.offsetWidth || 1200;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaPercent = (deltaX / containerWidth) * 100;
                    const newWidth = Math.min(70, Math.max(25, startWidth + deltaPercent));
                    setPreviewWidth(newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
              
              <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  📝 Editor
                </Typography>
              </Box>
              
              {isEditable ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1 }}>
                  <textarea
                    ref={textareaRef}
                    value={editableContent}
                    onChange={handleContentChange}
                    style={{
                      width: '100%',
                      flex: 1,
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.6,
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'none',
                      outline: 'none',
                      padding: '12px',
                      margin: '0',
                      overflow: 'auto',
                      backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Start typing your README content here..."
                  />
                </Box>
              ) : (
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  <pre
                    style={{
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                      padding: '0',
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                    }}
                  >
                    {editableContent}
                  </pre>
                </Box>
              )}
            </Box>

            {/* Preview Pane */}
            <Box sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  👀 Live Preview
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  flex: 1,
                  overflow: 'auto', 
                  p: 2,
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                }}
              >
                {isGenerating ? (
                  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="200px">
                    <CircularProgress size={40} sx={{ mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      🤖 Generating README...
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      fontSize: `${fontSize}px`,
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      '& h1, & h2, & h3, & h4, & h5, & h6': {
                        marginTop: '20px',
                        marginBottom: '10px',
                        fontWeight: 'bold',
                        color: theme === 'dark' ? '#ffffff' : '#000000',
                      },
                      '& h1': { fontSize: '2em' },
                      '& h2': { fontSize: '1.5em' },
                      '& h3': { fontSize: '1.25em' },
                      '& p': {
                        marginBottom: '12px',
                        lineHeight: 1.6,
                      },
                      '& pre': {
                        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f8f9fa',
                        padding: '12px',
                        borderRadius: '6px',
                        overflow: 'auto',
                        border: `1px solid ${theme === 'dark' ? '#444' : '#e9ecef'}`,
                        margin: '12px 0',
                      },
                      '& code': {
                        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f8f9fa',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontSize: '0.9em',
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      },
                      '& blockquote': {
                        borderLeft: `4px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                        paddingLeft: '12px',
                        margin: '12px 0',
                        fontStyle: 'italic',
                        color: theme === 'dark' ? '#ccc' : '#666',
                      },
                      '& ul, & ol': {
                        paddingLeft: '20px',
                        marginBottom: '12px',
                      },
                      '& li': {
                        marginBottom: '4px',
                      },
                      '& table': {
                        borderCollapse: 'collapse',
                        width: '100%',
                        marginBottom: '12px',
                        fontSize: '0.9em',
                      },
                      '& th, & td': {
                        border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                        padding: '6px 10px',
                        textAlign: 'left',
                      },
                      '& th': {
                        backgroundColor: theme === 'dark' ? '#333' : '#f5f5f5',
                        fontWeight: 'bold',
                      },
                      '& img': {
                        maxWidth: '100%',
                        height: 'auto',
                        margin: '8px 0',
                      },
                      '& a': {
                        color: theme === 'dark' ? '#4fc3f7' : '#1976d2',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      },
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight, rehypeRaw]}
                    >
                      {editableContent}
                    </ReactMarkdown>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default ReadmeLivePreview;
