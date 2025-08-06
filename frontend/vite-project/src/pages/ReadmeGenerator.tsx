import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  AppBar,
  Toolbar,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Avatar,
  Card,
  CardContent,
  Divider,
  IconButton,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService, type ReadmeResponse, type User } from '../services/api';
import ReadmeLivePreview from '../components/ReadmeLivePreview';

const ReadmeGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { repoName } = useParams<{ repoName: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [readmeData, setReadmeData] = useState<ReadmeResponse | null>(null);
  const [currentReadmeContent, setCurrentReadmeContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'traditional' | 'live-preview'>('traditional');

  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (!repoName) {
      navigate('/dashboard');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Convert repo name back from URL format
        const fullName = repoName!.replace('--', '/');
        const repoDisplayName = fullName.split('/')[1];

        // Load user info and generate README in parallel
        const [userInfo, readmeResponse] = await Promise.all([
          apiService.getCurrentUser(),
          apiService.generateReadme(repoDisplayName, fullName)
        ]);

        setUser(userInfo);
        setReadmeData(readmeResponse);
        setCurrentReadmeContent(readmeResponse.readme_content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate README');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, repoName]);

  const handleRegenerate = async () => {
    if (!repoName) return;
    
    try {
      setRegenerating(true);
      setError(null);

      const fullName = repoName.replace('--', '/');
      const repoDisplayName = fullName.split('/')[1];

      const readmeResponse = await apiService.generateReadme(repoDisplayName, fullName);
      setReadmeData(readmeResponse);
      setCurrentReadmeContent(readmeResponse.readme_content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate README');
    } finally {
      setRegenerating(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setCurrentReadmeContent(newContent);
  };

  const handleCopyToClipboard = async () => {
    if (!currentReadmeContent) return;

    try {
      await apiService.copyToClipboard(currentReadmeContent);
      setCopySuccess(true);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = () => {
    if (!readmeData || !currentReadmeContent) return;
    
    const fileName = `${readmeData.repo_analysis.name}-README.md`;
    apiService.downloadReadme(currentReadmeContent, fileName);
  };

  const handleCommitToRepo = async () => {
    if (!readmeData || !currentReadmeContent) return;

    try {
      setCommitting(true);
      setError(null);

      // Convert repo name back from URL format
      const fullName = repoName!.replace('--', '/');
      const repoDisplayName = fullName.split('/')[1];
      
      await apiService.commitReadmeToRepo(repoDisplayName, fullName, currentReadmeContent);
      setCommitSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit README to repository');
    } finally {
      setCommitting(false);
    }
  };

  const handleLogout = () => {
    apiService.clearToken();
    navigate('/login');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          🤖 Analyzing repository and generating README...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This may take a few moments
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* App Bar */}
      <AppBar position="static" sx={{ backgroundColor: '#24292e' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            🤖 Git-Me-AI
          </Typography>
          {user && (
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar src={user.avatar_url} alt={user.login} />
              <Typography variant="body1">{user.name || user.login}</Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {readmeData && (
          <>
            {/* Repository Info Header */}
            <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      📝 README Generated!
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Repository: {readmeData.repo_analysis.name}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8, mt: 1 }}>
                      {readmeData.repo_analysis.description}
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6" fontWeight="bold">🎉</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Ready to use!
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Repository Analysis */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  📊 Repository Analysis
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Primary Language:
                    </Typography>
                    <Chip 
                      label={readmeData.repo_analysis.language || 'Not specified'} 
                      color="primary" 
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  
                  {Object.keys(readmeData.repo_analysis.languages).length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Languages Detected:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {Object.entries(readmeData.repo_analysis.languages).map(([lang, bytes]) => (
                          <Chip 
                            key={lang}
                            label={`${lang} (${Math.round((bytes as number) / 1000)}KB)`}
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {readmeData.repo_analysis.dependencies.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Dependencies Found:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {readmeData.repo_analysis.dependencies.slice(0, 10).map((dep) => (
                          <Chip 
                            key={dep}
                            label={dep}
                            variant="outlined"
                            size="small"
                            color="secondary"
                          />
                        ))}
                        {readmeData.repo_analysis.dependencies.length > 10 && (
                          <Chip 
                            label={`+${readmeData.repo_analysis.dependencies.length - 10} more`}
                            variant="outlined"
                            size="small"
                            color="secondary"
                          />
                        )}
                      </Stack>
                    </Box>
                  )}

                  {readmeData.repo_analysis.main_files.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Key Files:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {readmeData.repo_analysis.main_files.map((file) => (
                          <Chip 
                            key={file}
                            label={file}
                            variant="outlined"
                            size="small"
                            color="info"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCopyToClipboard}
                sx={{ backgroundColor: '#007acc', '&:hover': { backgroundColor: '#005999' } }}
              >
                📋 Copy to Clipboard
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleDownload}
                sx={{ backgroundColor: '#28a745', '&:hover': { backgroundColor: '#218838' } }}
              >
                💾 Download README.md
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleCommitToRepo}
                disabled={committing}
                sx={{ 
                  backgroundColor: '#6f42c1', 
                  '&:hover': { backgroundColor: '#5a32a3' },
                  '&:disabled': { backgroundColor: '#cccccc' }
                }}
              >
                {committing ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                    Committing...
                  </>
                ) : (
                  '🚀 Commit to Repository'
                )}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleBackToDashboard}
              >
                ← Back to Repositories
              </Button>
            </Stack>

            {/* View Mode Toggle */}
            <Box sx={{ mb: 3 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => {
                  if (newMode !== null) {
                    setViewMode(newMode);
                  }
                }}
                aria-label="view mode"
              >
                <ToggleButton value="traditional" aria-label="traditional view">
                  📄 Traditional View
                </ToggleButton>
                <ToggleButton value="live-preview" aria-label="live preview">
                  📝 Live Preview Editor
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Conditional Content Based on View Mode */}
            {viewMode === 'traditional' ? (
              /* Traditional README Preview */
              <Paper sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    📄 Generated README.md
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={handleCopyToClipboard} title="Copy to clipboard">
                      📋
                    </IconButton>
                    <IconButton onClick={handleDownload} title="Download">
                      💾
                    </IconButton>
                  </Stack>
                </Stack>
                
                <Divider sx={{ mb: 3 }} />
                
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    backgroundColor: '#f8f9fa',
                    padding: 3,
                    borderRadius: 1,
                    border: '1px solid #e9ecef',
                    maxHeight: '600px',
                    overflow: 'auto'
                  }}
                >
                  {currentReadmeContent}
                </Box>
              </Paper>
            ) : (
              /* Live Preview Editor */
              <Box sx={{ height: '70vh', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <ReadmeLivePreview
                  readmeContent={currentReadmeContent}
                  isGenerating={regenerating}
                  onRegenerate={handleRegenerate}
                  onContentChange={handleContentChange}
                  repoName={readmeData.repo_analysis.name}
                  isEditable={true}
                />
              </Box>
            )}
          </>
        )}

        {/* Success Snackbar */}
        <Snackbar
          open={copySuccess}
          autoHideDuration={3000}
          onClose={() => setCopySuccess(false)}
          message="✅ README copied to clipboard!"
        />
        
        {/* Commit Success Snackbar */}
        <Snackbar
          open={commitSuccess}
          autoHideDuration={5000}
          onClose={() => setCommitSuccess(false)}
          message="🚀 README successfully committed to repository!"
        />
      </Container>
    </>
  );
};

export default ReadmeGenerator;
