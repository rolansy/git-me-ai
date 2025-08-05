import React, { useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  Stack,
  Avatar
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if user is already authenticated
    if (apiService.isAuthenticated()) {
      navigate('/dashboard');
      return;
    }

    // Handle OAuth callback
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('GitHub OAuth error:', error);
      // You might want to show an error message to the user
      return;
    }

    if (code) {
      handleGitHubCallback(code);
    }
  }, [searchParams, navigate]);

  const handleGitHubCallback = async (code: string) => {
    try {
      await apiService.login(code);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      // You might want to show an error message to the user
    }
  };

  const handleGitHubLogin = () => {
    const githubUrl = apiService.getGitHubOAuthUrl();
    window.location.href = githubUrl;
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          justifyContent: 'center'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            padding: 4, 
            width: '100%', 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <Stack spacing={3} alignItems="center">
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: '2rem'
              }}
            >
              🤖
            </Avatar>
            
            <Typography variant="h3" component="h1" fontWeight="bold">
              Git-Me-AI
            </Typography>
            
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Generate beautiful READMEs for your GitHub repositories using AI
            </Typography>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.8 }}>
                🚀 Connect your GitHub account to get started
              </Typography>
              
              <Button
                variant="contained"
                size="large"
                onClick={handleGitHubLogin}
                sx={{
                  backgroundColor: '#24292e',
                  color: 'white',
                  padding: '12px 32px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: '#1a1e22',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                🔗 Continue with GitHub
              </Button>
            </Box>
            
            <Box sx={{ mt: 3, opacity: 0.7 }}>
              <Typography variant="body2">
                ✨ Features:
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Typography variant="caption">📊 Repository Analysis</Typography>
                <Typography variant="caption">🔍 Smart Content Generation</Typography>
                <Typography variant="caption">📋 One-Click Copy</Typography>
                <Typography variant="caption">💾 Download Ready</Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            By connecting your GitHub account, you agree to our privacy policy.
            <br />
            We only access repository metadata to generate your README.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
