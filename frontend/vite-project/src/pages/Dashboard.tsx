import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  AppBar,
  Toolbar,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiService, type Repository, type User } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadUserData();
  }, [navigate]);

  useEffect(() => {
    // Filter repositories based on search term
    const filtered = repositories.filter(repo =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (repo.language && repo.language.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredRepos(filtered);
  }, [searchTerm, repositories]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user info and repositories in parallel
      const [userInfo, repos] = await Promise.all([
        apiService.getCurrentUser(),
        apiService.getRepositories()
      ]);

      setUser(userInfo);
      setRepositories(repos);
      setFilteredRepos(repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.clearToken();
    navigate('/login');
  };

  const handleGenerateReadme = (repo: Repository) => {
    navigate(`/generate/${repo.full_name.replace('/', '--')}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLanguageColor = (language: string | undefined) => {
    const colors: Record<string, string> = {
      JavaScript: '#f1e05a',
      TypeScript: '#2b7489',
      Python: '#3572A5',
      Java: '#b07219',
      'C++': '#f34b7d',
      'C#': '#239120',
      PHP: '#4F5D95',
      Go: '#00ADD8',
      Rust: '#dea584',
      Swift: '#fa7343',
      Kotlin: '#F18E33',
      Ruby: '#701516',
      Shell: '#89e051',
      HTML: '#e34c26',
      CSS: '#1572B6'
    };
    return colors[language || ''] || '#586069';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
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

        {/* User Stats */}
        {user && (
          <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={3}>
                <Avatar src={user.avatar_url} sx={{ width: 80, height: 80 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {user.name || user.login}
                  </Typography>
                  {user.bio && (
                    <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                      {user.bio}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{user.public_repos}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Repositories</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{user.followers}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Followers</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{user.following}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Following</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Search and Repositories */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Your Repositories
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  🔍
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />
        </Box>

        {filteredRepos.length === 0 ? (
          <Alert severity="info">
            {searchTerm ? 'No repositories match your search.' : 'No repositories found.'}
          </Alert>
        ) : (
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 3
            }}
          >
            {filteredRepos.map((repo) => (
              <Card 
                key={repo.id}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                  }
                }}
              >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="h6" component="h2" fontWeight="bold" noWrap>
                        {repo.name}
                      </Typography>
                      {repo.private && (
                        <Chip label="Private" size="small" color="warning" />
                      )}
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        height: '40px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {repo.description || 'No description available'}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      {repo.language && (
                        <Box display="flex" alignItems="center">
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getLanguageColor(repo.language),
                              mr: 1
                            }}
                          />
                          <Typography variant="body2">{repo.language}</Typography>
                        </Box>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Updated {formatDate(repo.updated_at)}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" gap={2}>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">⭐ {repo.stargazers_count}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">🍴 {repo.forks_count}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ padding: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleGenerateReadme(repo)}
                      sx={{
                        backgroundColor: '#28a745',
                        '&:hover': { backgroundColor: '#218838' }
                      }}
                    >
                      🚀 Generate README
                    </Button>
                  </CardActions>
                </Card>
            ))}
          </Box>
        )}
      </Container>
    </>
  );
};

export default Dashboard;
