import React, { useEffect, useState } from 'react';
import {
  Box,
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
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService, type ReadmeResponse, type User } from '../services/api';
import ReadmeLivePreview from '../components/ReadmeLivePreview';

const ReadmeGeneratorWithPreview: React.FC = () => {
  const navigate = useNavigate();
  const { repoName } = useParams<{ repoName: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [readmeData, setReadmeData] = useState<ReadmeResponse | null>(null);
  const [currentReadmeContent, setCurrentReadmeContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("📝 Add AI-generated README.md");
  const [autoSave, setAutoSave] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);

  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (!repoName) {
      navigate('/dashboard');
      return;
    }

    const loadInitialData = async () => {
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

    loadInitialData();
  }, [navigate, repoName]);

  const handleRegenerate = async () => {
    if (!repoName) return;
    
    try {
      setGenerating(true);
      setError(null);

      const fullName = repoName.replace('--', '/');
      const repoDisplayName = fullName.split('/')[1];

      const readmeResponse = await apiService.generateReadme(repoDisplayName, fullName);
      setReadmeData(readmeResponse);
      setCurrentReadmeContent(readmeResponse.readme_content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate README');
    } finally {
      setGenerating(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setCurrentReadmeContent(newContent);
    
    // Auto-save functionality (optional)
    if (autoSave && readmeData) {
      // You could implement auto-save to localStorage here
      localStorage.setItem(`readme_draft_${readmeData.repo_analysis.name}`, newContent);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await apiService.copyToClipboard(currentReadmeContent);
      setCopySuccess(true);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = () => {
    if (!readmeData) return;
    
    const fileName = `${readmeData.repo_analysis.name}-README.md`;
    apiService.downloadReadme(currentReadmeContent, fileName);
  };

  const handleCommitToRepo = async () => {
    if (!readmeData) return;

    try {
      setCommitting(true);
      setError(null);

      const fullName = repoName!.replace('--', '/');
      const repoDisplayName = fullName.split('/')[1];
      
      await apiService.commitReadmeToRepo(repoDisplayName, fullName, currentReadmeContent, commitMessage);
      setCommitSuccess(true);
      setShowCommitDialog(false);
      
      // Clear auto-save draft after successful commit
      localStorage.removeItem(`readme_draft_${readmeData.repo_analysis.name}`);
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

  const toggleAnalysisPanel = () => {
    setShowAnalysis(!showAnalysis);
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ backgroundColor: '#24292e', zIndex: 1300 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            🤖 Git-Me-AI - Live Preview
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

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Analysis Sidebar */}
        {showAnalysis && readmeData && (
          <Paper 
            elevation={3} 
            sx={{ 
              width: 350, 
              flexShrink: 0, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 0,
              borderRight: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                📊 Repository Analysis
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {readmeData.repo_analysis.name}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Stack spacing={3}>
                {/* Basic Info */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description:
                  </Typography>
                  <Typography variant="body2">
                    {readmeData.repo_analysis.description}
                  </Typography>
                </Box>

                {/* Primary Language */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Primary Language:
                  </Typography>
                  <Chip 
                    label={readmeData.repo_analysis.language || 'Not specified'} 
                    color="primary" 
                    size="small"
                  />
                </Box>
                
                {/* Languages */}
                {Object.keys(readmeData.repo_analysis.languages).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Languages Detected:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {Object.entries(readmeData.repo_analysis.languages).slice(0, 6).map(([lang, bytes]) => (
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

                {/* Dependencies */}
                {readmeData.repo_analysis.dependencies.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Key Dependencies:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {readmeData.repo_analysis.dependencies.slice(0, 8).map((dep) => (
                        <Chip 
                          key={dep}
                          label={dep}
                          variant="outlined"
                          size="small"
                          color="secondary"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Main Files */}
                {readmeData.repo_analysis.main_files.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Key Files:
                    </Typography>
                    <Stack spacing={0.5}>
                      {readmeData.repo_analysis.main_files.slice(0, 6).map((file) => (
                        <Typography 
                          key={file}
                          variant="caption" 
                          sx={{ 
                            fontFamily: 'monospace',
                            backgroundColor: 'grey.100',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          📄 {file}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleRegenerate}
                  disabled={generating}
                  sx={{ backgroundColor: '#28a745', '&:hover': { backgroundColor: '#218838' } }}
                >
                  {generating ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                      Regenerating...
                    </>
                  ) : (
                    '🔄 Regenerate README'
                  )}
                </Button>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCopyToClipboard}
                    sx={{ flex: 1 }}
                  >
                    📋 Copy
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleDownload}
                    sx={{ flex: 1 }}
                  >
                    💾 Download
                  </Button>
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setShowCommitDialog(true)}
                  disabled={committing}
                  sx={{ 
                    backgroundColor: '#6f42c1', 
                    '&:hover': { backgroundColor: '#5a32a3' }
                  }}
                >
                  🚀 Commit to Repo
                </Button>

                <Button
                  variant="text"
                  fullWidth
                  onClick={handleBackToDashboard}
                  size="small"
                >
                  ← Back to Repositories
                </Button>
              </Stack>
            </Box>
          </Paper>
        )}

        {/* Main Preview Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Toggle Analysis Button */}
          <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Button
                variant="text"
                size="small"
                onClick={toggleAnalysisPanel}
                startIcon={showAnalysis ? '◀' : '▶'}
              >
                {showAnalysis ? 'Hide' : 'Show'} Analysis
              </Button>
              
              <Stack direction="row" alignItems="center" spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Auto-save"
                  sx={{ fontSize: '12px' }}
                />
                
                {readmeData && (
                  <Typography variant="caption" color="text.secondary">
                    Repository: {readmeData.repo_analysis.name}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Live Preview Component */}
          {readmeData && (
            <ReadmeLivePreview
              readmeContent={currentReadmeContent}
              isGenerating={generating}
              onRegenerate={handleRegenerate}
              onContentChange={handleContentChange}
              repoName={readmeData.repo_analysis.name}
              isEditable={true}
            />
          )}
        </Box>
      </Box>

      {/* Commit Dialog */}
      <Dialog open={showCommitDialog} onClose={() => setShowCommitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🚀 Commit README to Repository</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will create or update the README.md file in your repository.
          </Typography>
          <TextField
            label="Commit Message"
            fullWidth
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="📝 Add AI-generated README.md"
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommitDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCommitToRepo} 
            variant="contained"
            disabled={committing}
          >
            {committing ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Committing...
              </>
            ) : (
              'Commit'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbars */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="✅ README copied to clipboard!"
      />
      
      <Snackbar
        open={commitSuccess}
        autoHideDuration={5000}
        onClose={() => setCommitSuccess(false)}
        message="🚀 README successfully committed to repository!"
      />
    </Box>
  );
};

export default ReadmeGeneratorWithPreview;
