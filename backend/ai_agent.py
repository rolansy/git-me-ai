import os
import asyncio
from typing import Dict, Tuple, List
from github import Github
from github.Repository import Repository
import re
import json
from datetime import datetime
import google.generativeai as genai

class ReadmeAgent:
    def __init__(self, api_token: str = None):
        """
        Initialize the README generation agent with enhanced project understanding
        """
        self.api_token = api_token
        
        # Configure Gemini API
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        else:
            print("Warning: GEMINI_API_KEY not found. AI description generation will be limited.")
            self.gemini_model = None
        
        # Project type detection patterns
        self.project_patterns = {
            'web_app': ['app.py', 'main.py', 'server.js', 'app.js', 'index.html', 'package.json'],
            'api': ['api', 'routes', 'endpoints', 'fastapi', 'flask', 'express'],
            'mobile': ['android', 'ios', 'flutter', 'react-native', 'swift', 'kotlin'],
            'desktop': ['electron', 'tkinter', 'qt', 'wpf', 'winforms'],
            'cli': ['cli', 'command', 'argparse', 'click', 'commander'],
            'library': ['lib', 'library', 'package', 'module'],
            'data_science': ['jupyter', 'notebook', 'pandas', 'numpy', 'matplotlib', 'sklearn'],
            'machine_learning': ['tensorflow', 'pytorch', 'keras', 'model', 'training'],
            'game': ['game', 'unity', 'pygame', 'godot', 'phaser'],
            'blockchain': ['smart contract', 'solidity', 'web3', 'ethereum', 'blockchain'],
            'microservice': ['docker', 'kubernetes', 'microservice', 'service'],
            'frontend': ['react', 'vue', 'angular', 'svelte', 'html', 'css', 'javascript'],
            'backend': ['server', 'backend', 'api', 'database', 'auth']
        }
        
        # Cool emoji mapping for different project types
        self.project_emojis = {
            'web_app': '🌐',
            'api': '🔌',
            'mobile': '📱',
            'desktop': '🖥️',
            'cli': '⌨️',
            'library': '📚',
            'data_science': '📊',
            'machine_learning': '🤖',
            'game': '🎮',
            'blockchain': '⛓️',
            'microservice': '🐳',
            'frontend': '💻',
            'backend': '⚙️',
            'default': '🚀'
        }

    def _detect_project_type(self, analysis: Dict) -> str:
        """
        Detect the type of project based on files, dependencies, structure, and content analysis
        """
        files = [f.lower() for f in analysis.get('files', [])]
        dependencies = [d.lower() for d in analysis.get('dependencies', [])]
        description = analysis.get('description', '').lower()
        language = analysis.get('language', '').lower()
        main_files = [f.lower() for f in analysis.get('main_files', [])]
        config_files = [f.lower() for f in analysis.get('config_files', [])]
        
        # Combine all text for analysis
        all_text = ' '.join(files + dependencies + [description, language] + main_files + config_files)
        
        # Enhanced scoring system with weighted patterns
        scores = {}
        
        # Web application detection (higher weight for specific indicators)
        web_indicators = ['index.html', 'app.js', 'main.js', 'server.js', 'package.json', 'webpack', 'vite', 'react', 'vue', 'angular', 'express', 'flask', 'django', 'fastapi']
        web_score = sum(3 if indicator in all_text else 0 for indicator in web_indicators)
        if web_score > 0:
            scores['web_app'] = web_score
        
        # API detection
        api_indicators = ['api', 'routes', 'endpoints', 'fastapi', 'flask', 'express', 'rest', 'graphql', 'swagger']
        api_score = sum(2 if indicator in all_text else 0 for indicator in api_indicators)
        if 'api' in all_text and api_score > 2:
            scores['api'] = api_score * 2  # Higher weight for clear API projects
        
        # Mobile app detection
        mobile_indicators = ['android', 'ios', 'flutter', 'react-native', 'swift', 'kotlin', 'xamarin', 'cordova']
        mobile_score = sum(4 if indicator in all_text else 0 for indicator in mobile_indicators)
        if mobile_score > 0:
            scores['mobile'] = mobile_score
        
        # Desktop application detection
        desktop_indicators = ['electron', 'tkinter', 'qt', 'wpf', 'winforms', 'javafx', 'swing', 'gtk']
        desktop_score = sum(3 if indicator in all_text else 0 for indicator in desktop_indicators)
        if desktop_score > 0:
            scores['desktop'] = desktop_score
        
        # CLI tool detection
        cli_indicators = ['cli', 'command', 'argparse', 'click', 'commander', 'bin/', 'console']
        cli_score = sum(2 if indicator in all_text else 0 for indicator in cli_indicators)
        if any(main_file in ['main.py', 'cli.py', 'command.py'] for main_file in main_files):
            cli_score += 3
        if cli_score > 0:
            scores['cli'] = cli_score
        
        # Library/package detection
        lib_indicators = ['lib', 'library', 'package', 'module', 'setup.py', 'pyproject.toml', 'cargo.toml']
        lib_score = sum(2 if indicator in all_text else 0 for indicator in lib_indicators)
        if 'setup.py' in files or 'pyproject.toml' in files or 'cargo.toml' in files:
            lib_score += 4
        if lib_score > 0:
            scores['library'] = lib_score
        
        # Data science detection
        ds_indicators = ['jupyter', 'notebook', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'plotly', 'sklearn', 'scipy']
        ds_score = sum(3 if indicator in all_text else 0 for indicator in ds_indicators)
        if any('.ipynb' in f for f in files):
            ds_score += 5
        if ds_score > 0:
            scores['data_science'] = ds_score
        
        # Machine learning detection
        ml_indicators = ['tensorflow', 'pytorch', 'keras', 'model', 'training', 'neural', 'deep', 'learning', 'ai', 'ml']
        ml_score = sum(3 if indicator in all_text else 0 for indicator in ml_indicators)
        if ml_score > 0:
            scores['machine_learning'] = ml_score
        
        # Game detection
        game_indicators = ['game', 'unity', 'pygame', 'godot', 'phaser', 'sprite', 'player', 'level']
        game_score = sum(3 if indicator in all_text else 0 for indicator in game_indicators)
        if game_score > 0:
            scores['game'] = game_score
        
        # Blockchain detection
        blockchain_indicators = ['smart contract', 'solidity', 'web3', 'ethereum', 'blockchain', 'crypto', 'defi', 'nft']
        blockchain_score = sum(4 if indicator in all_text else 0 for indicator in blockchain_indicators)
        if blockchain_score > 0:
            scores['blockchain'] = blockchain_score
        
        # Microservice detection
        micro_indicators = ['docker', 'kubernetes', 'microservice', 'service', 'container', 'k8s']
        micro_score = sum(2 if indicator in all_text else 0 for indicator in micro_indicators)
        if 'dockerfile' in config_files or 'docker-compose.yml' in config_files:
            micro_score += 3
        if micro_score > 0:
            scores['microservice'] = micro_score
        
        # Frontend-specific detection
        frontend_indicators = ['html', 'css', 'javascript', 'typescript', 'scss', 'sass', 'webpack', 'vite', 'rollup']
        frontend_score = sum(2 if indicator in all_text else 0 for indicator in frontend_indicators)
        if any(f in files for f in ['index.html', 'app.tsx', 'app.jsx', 'main.tsx']):
            frontend_score += 4
        if frontend_score > 5 and api_score < 3:  # Ensure it's primarily frontend
            scores['frontend'] = frontend_score
        
        # Backend-specific detection
        backend_indicators = ['server', 'backend', 'database', 'auth', 'middleware', 'controller', 'route']
        backend_score = sum(2 if indicator in all_text else 0 for indicator in backend_indicators)
        if any(f in main_files for f in ['server.py', 'app.py', 'main.py', 'server.js']):
            backend_score += 3
        if backend_score > 0 and frontend_score < backend_score:
            scores['backend'] = backend_score
        
        # Return the highest scoring type with minimum threshold
        if scores:
            best_type, best_score = max(scores.items(), key=lambda x: x[1])
            if best_score >= 2:  # Minimum confidence threshold
                return best_type
        
        # Fallback based on primary language and structure
        if language:
            if 'python' in language.lower():
                if any('app.py' in f or 'main.py' in f for f in main_files):
                    return 'web_app'
                elif any('.ipynb' in f for f in files):
                    return 'data_science'
                else:
                    return 'backend'
            elif any(lang in language.lower() for lang in ['javascript', 'typescript']):
                if 'index.html' in files:
                    return 'frontend'
                else:
                    return 'web_app'
            elif 'java' in language.lower():
                return 'backend'
            elif any(lang in language.lower() for lang in ['c++', 'c#', 'rust', 'go']):
                return 'backend'
        
        # Final fallback
        return 'web_app'

    async def _generate_project_description_with_gemini(self, analysis: Dict, project_type: str, repo: Repository) -> str:
        """
        Generate intelligent project description using Gemini AI by analyzing repository contents
        """
        if not self.gemini_model:
            return self._generate_fallback_description(analysis, project_type)
        
        try:
            # Gather comprehensive repository information for AI analysis
            repo_context = await self._gather_repository_context(repo, analysis)
            
            # Create a detailed prompt for Gemini
            prompt = self._create_description_prompt(analysis, project_type, repo_context)
            
            # Generate description using Gemini
            response = await asyncio.to_thread(
                self.gemini_model.generate_content,
                prompt
            )
            
            if response and response.text:
                description = response.text.strip()
                # Clean up the response
                description = self._clean_ai_description(description)
                if len(description) > 30 and "no description provided" not in description.lower():
                    return description
            
        except Exception as e:
            print(f"Error generating description with Gemini: {e}")
        
        # Fallback to intelligent generation
        return self._generate_fallback_description(analysis, project_type)

    async def _gather_repository_context(self, repo: Repository, analysis: Dict) -> Dict:
        """
        Gather comprehensive context about the repository for AI analysis
        """
        context = {
            "repository_name": repo.name,
            "primary_language": analysis.get('language', 'Unknown'),
            "languages": analysis.get('languages', {}),
            "dependencies": analysis.get('dependencies', []),
            "file_structure": analysis.get('structure', [])[:30],  # First 30 structure items
            "main_files": analysis.get('main_files', []),
            "config_files": analysis.get('config_files', []),
            "test_files": analysis.get('test_files', []),
            "setup_files": analysis.get('setup_files', []),
            "topics": analysis.get('topics', []),
            "file_samples": {}
        }
        
        # Get sample content from key files for better understanding
        try:
            key_files_to_analyze = []
            
            # Add main application files
            for file_name in analysis.get('main_files', [])[:3]:
                key_files_to_analyze.append(file_name)
            
            # Add package/config files
            for file_name in analysis.get('setup_files', [])[:2]:
                key_files_to_analyze.append(file_name)
            
            # Add any README-like files (even if we won't use them for description)
            readme_files = ['README.md', 'README.rst', 'README.txt', 'readme.md']
            for readme_file in readme_files:
                if readme_file in analysis.get('files', []):
                    key_files_to_analyze.append(readme_file)
                    break
            
            # Sample content from these files
            for file_name in key_files_to_analyze:
                try:
                    file_content = repo.get_contents(file_name)
                    if file_content.size < 50000:  # Reasonable size limit
                        content = file_content.decoded_content.decode('utf-8')
                        # Get first 1000 characters for context
                        context["file_samples"][file_name] = content[:1000]
                except Exception:
                    continue
                    
        except Exception as e:
            print(f"Error gathering file samples: {e}")
        
        return context

    def _create_description_prompt(self, analysis: Dict, project_type: str, repo_context: Dict) -> str:
        """
        Create a comprehensive prompt for Gemini to generate project description
        """
        prompt = f"""You are an expert software developer and technical writer. I need you to analyze a GitHub repository and generate a concise, professional project description (1-2 sentences, maximum 150 characters).

REPOSITORY INFORMATION:
- Name: {repo_context['repository_name']}
- Primary Language: {repo_context['primary_language']}
- Project Type: {project_type}
- Languages Used: {dict(list(repo_context['languages'].items())[:5])}
- Dependencies: {repo_context['dependencies'][:10]}
- Topics/Tags: {repo_context['topics']}

REPOSITORY STRUCTURE:
{chr(10).join(repo_context['file_structure'][:20])}

KEY FILES FOUND:
- Main files: {repo_context['main_files']}
- Config files: {repo_context['config_files']}
- Setup files: {repo_context['setup_files']}
- Test files: {repo_context['test_files'][:5]}

SAMPLE FILE CONTENTS:
"""
        
        # Add sample file contents
        for file_name, content in repo_context['file_samples'].items():
            if content:
                prompt += f"\n--- {file_name} (first 1000 chars) ---\n{content}\n"
        
        prompt += f"""

TASK:
Based on the above repository analysis, generate a concise, professional description that explains what this project does. The description should:

1. Be 1-2 sentences maximum (under 150 characters total)
2. Clearly explain the project's purpose and main functionality
3. Be written in present tense (e.g., "A web application that manages..." not "This project is...")
4. Include the main technology stack if relevant
5. Sound professional and engaging
6. NEVER include phrases like "No description provided" or "Description not available"

Focus on understanding what the code actually does by analyzing the file structure, dependencies, and code samples. Infer the project's purpose from these technical details.

Generate only the description text, nothing else:"""

        return prompt

    def _clean_ai_description(self, description: str) -> str:
        """
        Clean and format the AI-generated description
        """
        # Remove common AI response prefixes/suffixes
        description = re.sub(r'^(Description|Project Description|Summary):\s*', '', description, flags=re.IGNORECASE)
        description = re.sub(r'^(This is |This project is |The project is )', '', description, flags=re.IGNORECASE)
        
        # Remove quotes if wrapped
        description = description.strip('"\'')
        
        # Ensure it ends with a period
        if not description.endswith('.'):
            description += '.'
        
        # Remove any line breaks and extra spaces
        description = ' '.join(description.split())
        
        # Limit length to reasonable size
        if len(description) > 200:
            description = description[:197] + "..."
        
        return description

    def _generate_fallback_description(self, analysis: Dict, project_type: str) -> str:
        """
        Generate fallback description when Gemini API is not available
        """
        repo_name = analysis['name']
        language = analysis.get('language', 'Unknown')
        dependencies = analysis.get('dependencies', [])
        
        # Use the existing intelligent description generation as fallback
        return self._generate_intelligent_description(analysis, project_type, dependencies, language)

    async def _generate_project_description(self, analysis: Dict, project_type: str, repo: Repository) -> str:
        """
        Main method to generate project description - now uses Gemini AI
        """
        # Always use Gemini AI for description generation, never check existing README
        return await self._generate_project_description_with_gemini(analysis, project_type, repo)

    def _extract_description_from_contents(self, repo: Repository, analysis: Dict) -> str:
        """
        Extract project description by analyzing repository contents
        """
        description_sources = []
        
        try:
            # 1. Check existing README for description
            readme_desc = self._extract_from_readme(repo)
            if readme_desc:
                description_sources.append(readme_desc)
            
            # 2. Check package.json description
            package_desc = self._extract_from_package_json(repo)
            if package_desc:
                description_sources.append(package_desc)
            
            # 3. Check setup.py description
            setup_desc = self._extract_from_setup_py(repo)
            if setup_desc:
                description_sources.append(setup_desc)
            
            # 4. Check source code comments
            code_desc = self._extract_from_source_comments(repo, analysis)
            if code_desc:
                description_sources.append(code_desc)
            
            # 5. Check pyproject.toml or Cargo.toml
            toml_desc = self._extract_from_toml_files(repo)
            if toml_desc:
                description_sources.append(toml_desc)
            
            # Return the best description found
            if description_sources:
                # Prefer longer, more descriptive text
                best_desc = max(description_sources, key=len)
                if len(best_desc) > 30:
                    return best_desc
            
        except Exception as e:
            print(f"Error extracting description from contents: {e}")
        
        return ""

    def _extract_from_readme(self, repo: Repository) -> str:
        """
        Extract description from README file
        """
        try:
            readme_files = ['README.md', 'README.rst', 'README.txt', 'readme.md', 'Readme.md']
            for readme_name in readme_files:
                try:
                    readme = repo.get_contents(readme_name)
                    if readme.size < 100000:  # Limit size to avoid huge files
                        content = readme.decoded_content.decode('utf-8')
                        
                        # Extract description from markdown
                        lines = content.split('\n')
                        description_lines = []
                        
                        # Look for description after title
                        title_found = False
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                            
                            # Skip title lines (starting with #)
                            if line.startswith('#'):
                                title_found = True
                                continue
                            
                            # Skip badges and images
                            if '![' in line or line.startswith('[!['):
                                continue
                            
                            # Skip links and installation commands
                            if line.startswith('```') or line.startswith('- ') or line.startswith('*'):
                                break
                            
                            if title_found and len(line) > 20:
                                description_lines.append(line)
                                if len(' '.join(description_lines)) > 150:
                                    break
                        
                        if description_lines:
                            desc = ' '.join(description_lines).strip()
                            # Clean up the description
                            desc = desc.replace('**', '').replace('*', '').replace('`', '')
                            return desc[:300]  # Limit length
                            
                except Exception:
                    continue
        except Exception:
            pass
        return ""

    def _extract_from_package_json(self, repo: Repository) -> str:
        """
        Extract description from package.json
        """
        try:
            package_json = repo.get_contents("package.json")
            content = package_json.decoded_content.decode('utf-8')
            import json
            data = json.loads(content)
            desc = data.get('description', '')
            if desc and len(desc) > 20 and desc != repo.name:
                return desc
        except Exception:
            pass
        return ""

    def _extract_from_setup_py(self, repo: Repository) -> str:
        """
        Extract description from setup.py
        """
        try:
            setup_py = repo.get_contents("setup.py")
            content = setup_py.decoded_content.decode('utf-8')
            
            # Look for description in setup() call
            import re
            desc_patterns = [
                r'description\s*=\s*["\']([^"\']+)["\']',
                r'long_description\s*=\s*["\']([^"\']+)["\']'
            ]
            
            for pattern in desc_patterns:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    desc = match.group(1).strip()
                    if len(desc) > 20:
                        return desc
        except Exception:
            pass
        return ""

    def _extract_from_toml_files(self, repo: Repository) -> str:
        """
        Extract description from pyproject.toml or Cargo.toml
        """
        try:
            toml_files = ['pyproject.toml', 'Cargo.toml']
            for toml_file in toml_files:
                try:
                    toml_content = repo.get_contents(toml_file)
                    content = toml_content.decoded_content.decode('utf-8')
                    
                    # Simple parsing for description
                    import re
                    desc_pattern = r'description\s*=\s*["\']([^"\']+)["\']'
                    match = re.search(desc_pattern, content, re.IGNORECASE)
                    if match:
                        desc = match.group(1).strip()
                        if len(desc) > 20:
                            return desc
                except Exception:
                    continue
        except Exception:
            pass
        return ""

    def _extract_from_source_comments(self, repo: Repository, analysis: Dict) -> str:
        """
        Extract description from source code comments and docstrings
        """
        try:
            main_files = analysis.get('main_files', [])
            for file_name in main_files[:3]:  # Check first 3 main files
                try:
                    file_content = repo.get_contents(file_name)
                    if file_content.size < 50000:  # Reasonable file size
                        content = file_content.decoded_content.decode('utf-8')
                        
                        # Extract Python docstrings
                        if file_name.endswith('.py'):
                            desc = self._extract_python_docstring(content)
                            if desc:
                                return desc
                        
                        # Extract JavaScript comments
                        elif file_name.endswith(('.js', '.ts', '.jsx', '.tsx')):
                            desc = self._extract_js_comments(content)
                            if desc:
                                return desc
                        
                        # Extract other comments
                        else:
                            desc = self._extract_general_comments(content)
                            if desc:
                                return desc
                                
                except Exception:
                    continue
        except Exception:
            pass
        return ""

    def _extract_python_docstring(self, content: str) -> str:
        """
        Extract description from Python docstrings
        """
        import re
        
        # Look for module docstring
        docstring_patterns = [
            r'"""([^"]{50,500})"""',
            r"'''([^']{50,500})'''",
            r'r"""([^"]{50,500})"""'
        ]
        
        for pattern in docstring_patterns:
            match = re.search(pattern, content, re.DOTALL)
            if match:
                docstring = match.group(1).strip()
                # Clean up docstring
                lines = docstring.split('\n')
                clean_lines = [line.strip() for line in lines if line.strip()]
                if clean_lines:
                    return ' '.join(clean_lines[:3])  # First 3 lines
        return ""

    def _extract_js_comments(self, content: str) -> str:
        """
        Extract description from JavaScript comments
        """
        import re
        
        # Look for JSDoc comments or file header comments
        comment_patterns = [
            r'/\*\*([^*]{50,300})\*/',
            r'/\*([^*]{50,300})\*/'
        ]
        
        for pattern in comment_patterns:
            match = re.search(pattern, content, re.DOTALL)
            if match:
                comment = match.group(1).strip()
                # Clean up comment
                comment = re.sub(r'[*@]', '', comment)
                lines = comment.split('\n')
                clean_lines = [line.strip() for line in lines if line.strip()]
                if clean_lines:
                    return ' '.join(clean_lines[:2])
        return ""

    def _extract_general_comments(self, content: str) -> str:
        """
        Extract description from general file comments
        """
        lines = content.split('\n')[:20]  # Check first 20 lines
        comment_lines = []
        
        for line in lines:
            line = line.strip()
            if line.startswith('#') or line.startswith('//'):
                comment = line.lstrip('#/').strip()
                if len(comment) > 20 and not any(skip in comment.lower() for skip in ['todo', 'fixme', 'import', 'require']):
                    comment_lines.append(comment)
        
        if comment_lines:
            return ' '.join(comment_lines[:2])
        return ""

    def _generate_intelligent_description(self, analysis: Dict, project_type: str, dependencies: List[str], language: str) -> str:
        """
        Generate intelligent description based on project analysis
        """
        repo_name = analysis['name']
        
        # Smart description templates based on detected patterns
        smart_templates = {
            'web_app': self._generate_webapp_description(repo_name, dependencies, language),
            'api': self._generate_api_description(repo_name, dependencies, language),
            'mobile': f"A mobile application for {self._infer_platform(dependencies)}",
            'desktop': f"A desktop application built with {language}",
            'cli': f"A command-line utility for {self._infer_cli_purpose(repo_name, dependencies)}",
            'library': f"A {language} library providing {self._infer_library_purpose(repo_name, dependencies)}",
            'data_science': f"A data analysis project focused on {self._infer_data_purpose(repo_name, dependencies)}",
            'machine_learning': f"An AI/ML project for {self._infer_ml_purpose(repo_name, dependencies)}",
            'game': f"An interactive {self._infer_game_type(dependencies)} game",
            'blockchain': f"A blockchain application for {self._infer_blockchain_purpose(repo_name, dependencies)}",
            'microservice': f"A microservice handling {self._infer_service_purpose(repo_name)}",
            'frontend': f"A modern {self._infer_frontend_type(dependencies)} frontend application",
            'backend': f"A backend service providing {self._infer_backend_purpose(repo_name, dependencies)}"
        }
        
        return smart_templates.get(project_type, f"A {language} project called {repo_name}")

    def _generate_webapp_description(self, repo_name: str, dependencies: List[str], language: str) -> str:
        """Generate smart web app description"""
        frameworks = []
        if any('react' in dep.lower() for dep in dependencies):
            frameworks.append('React')
        if any('vue' in dep.lower() for dep in dependencies):
            frameworks.append('Vue.js')
        if any('angular' in dep.lower() for dep in dependencies):
            frameworks.append('Angular')
        if any('flask' in dep.lower() for dep in dependencies):
            frameworks.append('Flask')
        if any('django' in dep.lower() for dep in dependencies):
            frameworks.append('Django')
        
        if frameworks:
            return f"A modern web application built with {frameworks[0]}"
        
        # Infer purpose from name
        if any(word in repo_name.lower() for word in ['blog', 'news', 'article']):
            return "A content management and blogging platform"
        elif any(word in repo_name.lower() for word in ['shop', 'store', 'cart', 'ecommerce']):
            return "An e-commerce platform for online shopping"
        elif any(word in repo_name.lower() for word in ['chat', 'message', 'communication']):
            return "A real-time messaging and communication platform"
        elif any(word in repo_name.lower() for word in ['task', 'todo', 'project', 'management']):
            return "A project and task management application"
        elif any(word in repo_name.lower() for word in ['social', 'network', 'community']):
            return "A social networking and community platform"
        else:
            return f"A full-stack web application built with {language}"

    def _generate_api_description(self, repo_name: str, dependencies: List[str], language: str) -> str:
        """Generate smart API description"""
        if any('fastapi' in dep.lower() for dep in dependencies):
            framework = "FastAPI"
        elif any('flask' in dep.lower() for dep in dependencies):
            framework = "Flask"
        elif any('express' in dep.lower() for dep in dependencies):
            framework = "Express.js"
        elif any('django' in dep.lower() for dep in dependencies):
            framework = "Django REST"
        else:
            framework = language
            
        # Infer API purpose from name
        if any(word in repo_name.lower() for word in ['auth', 'login', 'user']):
            return f"A {framework} authentication and user management API"
        elif any(word in repo_name.lower() for word in ['payment', 'billing', 'transaction']):
            return f"A {framework} payment processing API"
        elif any(word in repo_name.lower() for word in ['data', 'analytics', 'metrics']):
            return f"A {framework} data analytics and metrics API"
        elif any(word in repo_name.lower() for word in ['notification', 'email', 'sms']):
            return f"A {framework} notification and messaging API"
        else:
            return f"A RESTful API service built with {framework}"

    def _infer_platform(self, dependencies: List[str]) -> str:
        if any('react-native' in dep.lower() for dep in dependencies):
            return "iOS and Android using React Native"
        elif any('flutter' in dep.lower() for dep in dependencies):
            return "cross-platform mobile development with Flutter"
        elif any('swift' in dep.lower() for dep in dependencies):
            return "iOS devices"
        elif any('kotlin' in dep.lower() for dep in dependencies):
            return "Android devices"
        else:
            return "mobile platforms"

    def _infer_cli_purpose(self, repo_name: str, dependencies: List[str]) -> str:
        if any(word in repo_name.lower() for word in ['deploy', 'build', 'ci', 'cd']):
            return "deployment and build automation"
        elif any(word in repo_name.lower() for word in ['file', 'directory', 'folder']):
            return "file and directory management"
        elif any(word in repo_name.lower() for word in ['git', 'version', 'commit']):
            return "version control and Git operations"
        elif any(word in repo_name.lower() for word in ['config', 'setup', 'init']):
            return "configuration and project setup"
        else:
            return "command-line operations"

    def _infer_library_purpose(self, repo_name: str, dependencies: List[str]) -> str:
        if any(word in repo_name.lower() for word in ['http', 'request', 'client']):
            return "HTTP client functionality"
        elif any(word in repo_name.lower() for word in ['parse', 'parser', 'syntax']):
            return "parsing and data processing utilities"
        elif any(word in repo_name.lower() for word in ['util', 'helper', 'common']):
            return "utility functions and helpers"
        elif any(word in repo_name.lower() for word in ['ui', 'component', 'widget']):
            return "UI components and interface elements"
        else:
            return "reusable functionality"

    def _infer_data_purpose(self, repo_name: str, dependencies: List[str]) -> str:
        if any(word in repo_name.lower() for word in ['finance', 'stock', 'trading']):
            return "financial data analysis"
        elif any(word in repo_name.lower() for word in ['weather', 'climate', 'forecast']):
            return "weather and climate data analysis"
        elif any(word in repo_name.lower() for word in ['sales', 'revenue', 'business']):
            return "business intelligence and sales analytics"
        elif any(word in repo_name.lower() for word in ['covid', 'health', 'medical']):
            return "healthcare and medical data analysis"
        else:
            return "data exploration and visualization"

    def _infer_ml_purpose(self, repo_name: str, dependencies: List[str]) -> str:
        if any(word in repo_name.lower() for word in ['image', 'vision', 'photo']):
            return "computer vision and image processing"
        elif any(word in repo_name.lower() for word in ['text', 'nlp', 'language']):
            return "natural language processing"
        elif any(word in repo_name.lower() for word in ['predict', 'forecast', 'model']):
            return "predictive modeling and forecasting"
        elif any(word in repo_name.lower() for word in ['classify', 'classification', 'detect']):
            return "classification and detection tasks"
        else:
            return "machine learning applications"

    def _infer_game_type(self, dependencies: List[str]) -> str:
        if any('pygame' in dep.lower() for dep in dependencies):
            return "Python-based"
        elif any('unity' in dep.lower() for dep in dependencies):
            return "Unity"
        elif any('phaser' in dep.lower() for dep in dependencies):
            return "web-based"
        else:
            return "interactive"

    def _infer_blockchain_purpose(self, repo_name: str, dependencies: List[str]) -> str:
        if any(word in repo_name.lower() for word in ['defi', 'swap', 'liquidity']):
            return "decentralized finance (DeFi)"
        elif any(word in repo_name.lower() for word in ['nft', 'token', 'collectible']):
            return "NFT and digital collectibles"
        elif any(word in repo_name.lower() for word in ['dao', 'governance', 'voting']):
            return "decentralized governance"
        else:
            return "blockchain operations"

    def _infer_service_purpose(self, repo_name: str) -> str:
        if any(word in repo_name.lower() for word in ['auth', 'login', 'user']):
            return "authentication and user management"
        elif any(word in repo_name.lower() for word in ['payment', 'billing']):
            return "payment processing"
        elif any(word in repo_name.lower() for word in ['notification', 'email']):
            return "notification services"
        elif any(word in repo_name.lower() for word in ['file', 'upload', 'storage']):
            return "file storage and management"
        else:
            return "business logic operations"

    def _infer_frontend_type(self, dependencies: List[str]) -> str:
        if any('react' in dep.lower() for dep in dependencies):
            return "React-based"
        elif any('vue' in dep.lower() for dep in dependencies):
            return "Vue.js"
        elif any('angular' in dep.lower() for dep in dependencies):
            return "Angular"
        elif any('svelte' in dep.lower() for dep in dependencies):
            return "Svelte"
        else:
            return "JavaScript"

    def _infer_backend_purpose(self, repo_name: str, dependencies: List[str]) -> str:
        if any(word in repo_name.lower() for word in ['api', 'rest', 'graphql']):
            return "API endpoints and data services"
        elif any(word in repo_name.lower() for word in ['auth', 'login']):
            return "authentication and authorization"
        elif any(word in repo_name.lower() for word in ['database', 'data', 'storage']):
            return "data management and storage"
        else:
            return "server-side functionality"

    def _detect_technical_enhancements(self, dependencies: List[str], analysis: Dict) -> List[str]:
        """
        Detect technical enhancements based on dependencies and project structure
        """
        enhancements = []
        
        # Framework detection
        if any('react' in dep.lower() for dep in dependencies):
            enhancements.append('React UI')
        if any('typescript' in dep.lower() for dep in dependencies):
            enhancements.append('TypeScript support')
        if any('docker' in ' '.join(analysis.get('config_files', [])).lower()):
            enhancements.append('Docker containerization')
        if analysis.get('test_files'):
            enhancements.append('comprehensive testing')
        if any('redis' in dep.lower() for dep in dependencies):
            enhancements.append('Redis caching')
        if any('postgresql' in dep.lower() for dep in dependencies):
            enhancements.append('PostgreSQL database')
        if any('mongodb' in dep.lower() for dep in dependencies):
            enhancements.append('MongoDB integration')
        if any('jwt' in dep.lower() for dep in dependencies):
            enhancements.append('JWT authentication')
        if any('cors' in dep.lower() for dep in dependencies):
            enhancements.append('CORS support')
        
        return enhancements

    def _generate_cool_readme_template(self, analysis: Dict, project_type: str) -> str:
        """
        Generate a cool, comprehensive README template
        """
        emoji = self.project_emojis.get(project_type, self.project_emojis['default'])
        
        return f"""<div align="center">

# {emoji} {{repo_name}}

{{description}}

[![GitHub stars](https://img.shields.io/github/stars/{{{{github_user}}}}/{{{{repo_name}}}})](https://github.com/{{{{github_user}}}}/{{{{repo_name}}}}/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/{{{{github_user}}}}/{{{{repo_name}}}})](https://github.com/{{{{github_user}}}}/{{{{repo_name}}}}/network)
[![GitHub issues](https://img.shields.io/github/issues/{{{{github_user}}}}/{{{{repo_name}}}})](https://github.com/{{{{github_user}}}}/{{{{repo_name}}}}/issues)
[![GitHub license](https://img.shields.io/github/license/{{{{github_user}}}}/{{{{repo_name}}}})](https://github.com/{{{{github_user}}}}/{{{{repo_name}}}}/blob/main/LICENSE)

{{project_preview}}

</div>

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛠️ Technologies](#️-technologies)
- [🚀 Quick Start](#-quick-start)
- [📁 Project Structure](#-project-structure)
- [⚙️ Installation](#️-installation)
- [🎯 Usage](#-usage)
- [🔧 Configuration](#-configuration)
- [📖 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🚢 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)
- [💬 Support](#-support)

## ✨ Features

{{features_list}}

## 🛠️ Technologies

{{technologies_section}}

## 🚀 Quick Start

{{quick_start_section}}

## 📁 Project Structure

```
{{file_structure}}
```

{{structure_explanation}}

## ⚙️ Installation

{{installation_instructions}}

## 🎯 Usage

{{usage_section}}

## 🔧 Configuration

{{configuration_section}}

## 📖 API Documentation

{{api_documentation}}

## 🧪 Testing

{{testing_section}}

## 🚢 Deployment

{{deployment_section}}

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add some amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🔄 Open a Pull Request

### Development Guidelines

- 📝 Follow the existing code style
- ✅ Add tests for new features
- 📚 Update documentation as needed
- 🔍 Ensure all tests pass before submitting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- 📧 Email: [your-email@example.com](mailto:your-email@example.com)
- 💬 Discord: [Join our community](https://discord.gg/yourserver)
- 🐛 Issues: [GitHub Issues](https://github.com/{{{{github_user}}}}/{{{{repo_name}}}}/issues)
- 📖 Documentation: [Wiki](https://github.com/{{{{github_user}}}}/{{{{repo_name}}}}/wiki)

---

<div align="center">

**⭐ Star this repository if you find it helpful! ⭐**

Made with ❤️ by [Your Name](https://github.com/{{{{github_user}}}})

</div>"""
    async def analyze_repository(self, repo: Repository) -> Dict:
        """
        Deep analysis of repository structure and content with enhanced understanding
        """
        try:
            analysis = {
                "name": repo.name,
                "description": repo.description or "No description provided",
                "language": repo.language,
                "size": repo.size,
                "stars": repo.stargazers_count,
                "forks": repo.forks_count,
                "topics": repo.get_topics(),
                "files": [],
                "dependencies": [],
                "languages": {},
                "structure": [],
                "main_files": [],
                "setup_files": [],
                "config_files": [],
                "test_files": [],
                "doc_files": [],
                "readme_exists": False,
                "license_exists": False,
                "github_user": repo.owner.login,
                "created_at": repo.created_at,
                "updated_at": repo.updated_at,
                "default_branch": repo.default_branch
            }
            
            # Get repository languages
            languages = repo.get_languages()
            analysis["languages"] = languages
            
            # Get repository contents with deeper analysis
            try:
                contents = repo.get_contents("")
                analysis["files"] = [content.name for content in contents]
                
                # Categorize files
                for content in contents:
                    file_name = content.name.lower()
                    
                    # Setup/config files
                    if file_name in ["package.json", "requirements.txt", "pom.xml", "cargo.toml", 
                                   "go.mod", "composer.json", "gemfile", "setup.py", "pyproject.toml"]:
                        analysis["setup_files"].append(content.name)
                        try:
                            if content.size < 50000:
                                file_content = content.decoded_content.decode('utf-8')
                                analysis["dependencies"].extend(self._extract_dependencies(file_name, file_content))
                        except Exception:
                            pass
                    
                    # Configuration files
                    elif file_name in [".env", "config.json", "settings.json", ".env.example", 
                                     "docker-compose.yml", "dockerfile", "makefile"]:
                        analysis["config_files"].append(content.name)
                    
                    # Test files
                    elif any(test_word in file_name for test_word in ['test', 'spec', '__test__']):
                        analysis["test_files"].append(content.name)
                    
                    # Documentation files
                    elif file_name in ["readme.md", "readme.rst", "readme.txt", "docs.md", "changelog.md"]:
                        analysis["doc_files"].append(content.name)
                        if "readme" in file_name:
                            analysis["readme_exists"] = True
                    
                    # License file
                    elif file_name in ["license", "license.md", "license.txt", "mit", "apache"]:
                        analysis["license_exists"] = True
                    
                    # Main application files
                    elif file_name in ["main.py", "app.py", "index.js", "index.html", "main.java", 
                                     "main.go", "app.tsx", "app.jsx", "server.js", "api.py"]:
                        analysis["main_files"].append(content.name)
                
                # Build comprehensive file structure
                analysis["structure"] = self._build_comprehensive_structure(repo, max_depth=4)
                
            except Exception as e:
                print(f"Error reading repository contents: {e}")
                analysis["files"] = ["Unable to read repository contents"]
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing repository: {e}")
            return {
                "name": repo.name,
                "description": "Error analyzing repository",
                "language": repo.language or "Unknown",
                "files": [],
                "dependencies": [],
                "languages": {},
                "structure": [],
                "main_files": [],
                "setup_files": [],
                "config_files": [],
                "test_files": [],
                "doc_files": [],
                "readme_exists": False,
                "license_exists": False,
                "github_user": repo.owner.login if repo.owner else "unknown"
            }

    def _extract_dependencies(self, filename: str, content: str) -> List[str]:
        """
        Extract dependencies from different types of dependency files
        """
        dependencies = []
        
        try:
            if filename == "package.json":
                import json
                data = json.loads(content)
                deps = data.get("dependencies", {})
                dev_deps = data.get("devDependencies", {})
                dependencies.extend(list(deps.keys()))
                dependencies.extend(list(dev_deps.keys()))
                
            elif filename == "requirements.txt":
                lines = content.split('\n')
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        # Extract package name (before ==, >=, etc.)
                        package = re.split(r'[><=!]', line)[0].strip()
                        if package:
                            dependencies.append(package)
                            
            elif filename in ["pom.xml"]:
                # Basic XML parsing for Maven dependencies
                import re
                artifact_pattern = r'<artifactId>(.*?)</artifactId>'
                matches = re.findall(artifact_pattern, content)
                dependencies.extend(matches)
                
        except Exception as e:
            print(f"Error extracting dependencies from {filename}: {e}")
        
        return dependencies[:20]  # Limit to first 20 dependencies

    def _build_comprehensive_structure(self, repo: Repository, path: str = "", max_depth: int = 4, current_depth: int = 0) -> List[str]:
        """
        Build a comprehensive tree-like structure of the repository
        """
        if current_depth >= max_depth:
            return []
        
        structure = []
        try:
            contents = repo.get_contents(path)
            
            # Sort contents: directories first, then files
            dirs = [c for c in contents if c.type == "dir"]
            files = [c for c in contents if c.type == "file"]
            
            # Add directories
            for content in dirs[:10]:  # Limit directories
                indent = "│   " * current_depth + "├── "
                if current_depth == 0:
                    indent = ""
                structure.append(f"{indent}📁 {content.name}/")
                
                # Recursively get subdirectory contents
                substructure = self._build_comprehensive_structure(
                    repo, content.path, max_depth, current_depth + 1
                )
                structure.extend(substructure)
            
            # Add files with appropriate icons
            for content in files[:15]:  # Limit files per directory
                indent = "│   " * current_depth + "├── "
                if current_depth == 0:
                    indent = ""
                
                icon = self._get_file_icon(content.name)
                structure.append(f"{indent}{icon} {content.name}")
                
        except Exception:
            pass
        
        return structure

    def _get_file_icon(self, filename: str) -> str:
        """
        Get appropriate emoji icon for file types
        """
        filename_lower = filename.lower()
        
        if filename_lower.endswith(('.py', '.pyx')):
            return '🐍'
        elif filename_lower.endswith(('.js', '.jsx', '.ts', '.tsx')):
            return '⚡'
        elif filename_lower.endswith(('.html', '.htm')):
            return '🌐'
        elif filename_lower.endswith(('.css', '.scss', '.sass')):
            return '🎨'
        elif filename_lower.endswith(('.json', '.yaml', '.yml')):
            return '⚙️'
        elif filename_lower.endswith(('.md', '.rst', '.txt')):
            return '📝'
        elif filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.svg')):
            return '🖼️'
        elif filename_lower.endswith(('.mp4', '.avi', '.mov')):
            return '🎬'
        elif filename_lower.endswith(('.mp3', '.wav', '.flac')):
            return '🎵'
        elif filename_lower.endswith(('.zip', '.tar', '.gz')):
            return '📦'
        elif filename_lower == 'dockerfile':
            return '🐳'
        elif filename_lower.endswith('.env'):
            return '🔐'
        elif 'test' in filename_lower:
            return '🧪'
        elif filename_lower.endswith(('.sql', '.db')):
            return '🗄️'
        else:
            return '📄'

    def _generate_features_list(self, analysis: Dict, project_type: str) -> str:
        """
        Generate a features list based on project analysis
        """
        features = []
        
        # Base features based on project type
        type_features = {
            'web_app': ['🌐 Modern web interface', '📱 Responsive design', '⚡ Fast performance'],
            'api': ['🔌 RESTful API endpoints', '📚 Comprehensive documentation', '🔒 Secure authentication'],
            'mobile': ['📱 Cross-platform compatibility', '🎨 Native UI components', '🔄 Offline functionality'],
            'data_science': ['📊 Data visualization', '🔍 Statistical analysis', '📈 Interactive charts'],
            'machine_learning': ['🤖 AI-powered predictions', '📊 Model training', '🎯 High accuracy'],
            'cli': ['⌨️ Command-line interface', '🔧 Configurable options', '📝 Detailed help system']
        }
        
        features.extend(type_features.get(project_type, ['🚀 Core functionality', '⚡ High performance']))
        
        # Add features based on detected technologies
        if 'docker' in ' '.join(analysis.get('dependencies', [])).lower():
            features.append('🐳 Docker containerization')
        
        if analysis.get('test_files'):
            features.append('🧪 Comprehensive test suite')
        
        if 'api' in analysis.get('description', '').lower():
            features.append('🔌 RESTful API')
        
        if any('database' in dep.lower() for dep in analysis.get('dependencies', [])):
            features.append('🗄️ Database integration')
        
        # Format as markdown list
        return '\n'.join([f"- {feature}" for feature in features[:8]])

    def _generate_technologies_section(self, analysis: Dict) -> str:
        """
        Generate a comprehensive technologies section
        """
        languages = analysis.get('languages', {})
        dependencies = analysis.get('dependencies', [])
        
        sections = []
        
        # Programming Languages
        if languages:
            lang_section = "### Programming Languages\n\n"
            for lang, bytes_count in sorted(languages.items(), key=lambda x: x[1], reverse=True)[:5]:
                percentage = round((bytes_count / sum(languages.values())) * 100, 1)
                lang_section += f"- **{lang}** ({percentage}%)\n"
            sections.append(lang_section)
        
        # Frameworks & Libraries
        if dependencies:
            dep_section = "### Frameworks & Libraries\n\n"
            for dep in dependencies[:10]:
                dep_section += f"- `{dep}`\n"
            sections.append(dep_section)
        
        # Tools & Utilities
        tools = []
        if analysis.get('config_files'):
            if any('docker' in f.lower() for f in analysis['config_files']):
                tools.append('🐳 Docker')
            if any('makefile' in f.lower() for f in analysis['config_files']):
                tools.append('🔨 Make')
        
        if tools:
            sections.append("### Tools & Utilities\n\n" + '\n'.join([f"- {tool}" for tool in tools]))
        
        return '\n'.join(sections)

    def _generate_quick_start(self, analysis: Dict) -> str:
        """
        Generate a quick start section
        """
        language = analysis.get('language', '').lower()
        setup_files = analysis.get('setup_files', [])
        
        quick_start = "Get up and running in minutes:\n\n"
        quick_start += "```bash\n"
        quick_start += f"# Clone the repository\n"
        quick_start += f"git clone https://github.com/{analysis.get('github_user', 'username')}/{analysis['name']}.git\n"
        quick_start += f"cd {analysis['name']}\n\n"
        
        if 'package.json' in setup_files:
            quick_start += "# Install dependencies\nnpm install\n\n# Start development server\nnpm start\n"
        elif 'requirements.txt' in setup_files:
            quick_start += "# Create virtual environment\npython -m venv venv\nsource venv/bin/activate  # On Windows: venv\\Scripts\\activate\n\n# Install dependencies\npip install -r requirements.txt\n\n# Run the application\npython main.py\n"
        elif 'cargo.toml' in setup_files:
            quick_start += "# Build and run\ncargo run\n"
        elif 'go.mod' in setup_files:
            quick_start += "# Run the application\ngo run main.go\n"
        else:
            quick_start += "# Follow installation instructions below\n"
        
        quick_start += "```"
        return quick_start

    def _generate_usage_section(self, analysis: Dict, project_type: str) -> str:
        """
        Generate usage section based on project type
        """
        usage_templates = {
            'api': """### Basic API Usage

```bash
# Example API calls
curl -X GET "https://api.yourdomain.com/api/endpoint"
curl -X POST "https://api.yourdomain.com/api/data" -H "Content-Type: application/json" -d '{"key": "value"}'
```

### Authentication

```bash
# Get authentication token
curl -X POST "https://api.yourdomain.com/auth/login" -d '{"username": "user", "password": "pass"}'
```""",
            'cli': """### Command Line Usage

```bash
# Basic usage
./{} --help

# Common commands
./{} command --option value
./{} --config config.json
```""".format(analysis['name'], analysis['name'], analysis['name']),
            'web_app': """### Using the Application

1. 🌐 Open your browser and navigate to `http://localhost:3000`
2. 📝 Create an account or sign in
3. 🚀 Start using the features!

### Available Routes

- `/` - Home page
- `/dashboard` - User dashboard
- `/settings` - Configuration""",
            'library': """### Installation

```bash
pip install {}
```

### Basic Usage

```python
from {} import MainClass

# Initialize
app = MainClass()

# Use the library
result = app.method()
```""".format(analysis['name'], analysis['name'])
        }
        
        return usage_templates.get(project_type, "Detailed usage instructions coming soon...")

    def _generate_testing_section(self, analysis: Dict) -> str:
        """
        Generate testing section if tests are detected
        """
        if not analysis.get('test_files'):
            return "```bash\n# Tests will be added soon\necho \"No tests yet\"\n```"
        
        language = analysis.get('language', '').lower()
        
        if 'python' in language:
            return """```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src tests/

# Run specific test file
pytest tests/test_specific.py
```"""
        elif 'javascript' in language or 'typescript' in language:
            return """```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```"""
        else:
            return """```bash
# Run tests
make test

# Or check the specific testing framework used in this project
```"""
    def _generate_setup_instructions(self, analysis: Dict) -> str:
        """
        Generate comprehensive setup instructions based on detected technologies
        """
        languages = analysis.get("languages", {})
        setup_files = analysis.get("setup_files", [])
        
        instructions = []
        
        # Prerequisites section
        instructions.append("### Prerequisites\n")
        
        if "Python" in languages:
            instructions.append("- Python 3.8+ installed")
        if "JavaScript" in languages or "TypeScript" in languages:
            instructions.append("- Node.js 16+ and npm")
        if "Java" in languages:
            instructions.append("- Java 11+ and Maven/Gradle")
        if "Go" in languages:
            instructions.append("- Go 1.19+")
        if "Rust" in languages:
            instructions.append("- Rust 1.60+")
        
        instructions.append("\n### Installation Steps\n")
        
        # Clone repository
        instructions.extend([
            "1. **Clone the repository**",
            "   ```bash",
            f"   git clone https://github.com/{analysis.get('github_user', 'username')}/{analysis['name']}.git",
            f"   cd {analysis['name']}",
            "   ```\n"
        ])
        
        # Language-specific setup
        if "Python" in languages:
            instructions.extend([
                "2. **Set up Python environment**",
                "   ```bash",
                "   # Create virtual environment",
                "   python -m venv venv",
                "",
                "   # Activate virtual environment",
                "   # On Windows:",
                "   venv\\Scripts\\activate",
                "   # On macOS/Linux:",
                "   source venv/bin/activate",
                "",
                "   # Install dependencies"
            ])
            if "requirements.txt" in setup_files:
                instructions.append("   pip install -r requirements.txt")
            elif "setup.py" in setup_files:
                instructions.append("   pip install -e .")
            instructions.append("   ```\n")
            
        elif "JavaScript" in languages or "TypeScript" in languages:
            instructions.extend([
                "2. **Install dependencies**",
                "   ```bash"
            ])
            if "package.json" in setup_files:
                instructions.extend([
                    "   npm install",
                    "   # or",
                    "   yarn install"
                ])
            instructions.append("   ```\n")
            
        elif "Java" in languages:
            instructions.extend([
                "2. **Build the project**",
                "   ```bash"
            ])
            if "pom.xml" in setup_files:
                instructions.append("   mvn clean install")
            elif "build.gradle" in setup_files:
                instructions.append("   ./gradlew build")
            instructions.append("   ```\n")
        
        # Environment configuration
        if any('.env' in f for f in analysis.get('config_files', [])):
            instructions.extend([
                "3. **Configure environment**",
                "   ```bash",
                "   cp .env.example .env",
                "   # Edit .env with your configuration",
                "   ```\n"
            ])
        
        return "\n".join(instructions)

    async def generate_readme(self, repo: Repository) -> Tuple[str, Dict]:
        """
        Generate a comprehensive, cool README for the repository
        """
        # Deep analysis of repository
        analysis = await self.analyze_repository(repo)
        
        # Detect project type
        project_type = self._detect_project_type(analysis)
        
        # Generate enhanced description using Gemini AI (ignores existing README)
        enhanced_description = await self._generate_project_description(analysis, project_type, repo)
        analysis['enhanced_description'] = enhanced_description
        
        # Get the cool README template
        template = self._generate_cool_readme_template(analysis, project_type)
        
        # Generate all sections
        features_list = self._generate_features_list(analysis, project_type)
        technologies_section = self._generate_technologies_section(analysis)
        quick_start_section = self._generate_quick_start(analysis)
        file_structure = "\n".join(analysis["structure"][:40])
        installation_instructions = self._generate_setup_instructions(analysis)
        usage_section = self._generate_usage_section(analysis, project_type)
        testing_section = self._generate_testing_section(analysis)
        
        # Structure explanation
        structure_explanation = self._generate_structure_explanation(analysis)
        
        # Project preview (if it's a web app)
        project_preview = ""
        if project_type in ['web_app', 'frontend']:
            project_preview = """
![Project Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=Add+Your+Project+Screenshot+Here)

> 🎯 **Live Demo:** [View Demo](https://your-demo-url.com) | 📖 **Documentation:** [Read Docs](https://your-docs-url.com)
"""
        
        # Configuration section
        configuration_section = self._generate_configuration_section(analysis)
        
        # API documentation
        api_documentation = "Coming soon..." if project_type != 'api' else self._generate_api_docs_section(analysis)
        
        # Deployment section
        deployment_section = self._generate_deployment_section(analysis, project_type)
        
        # Fill in the template
        readme_content = template.format(
            repo_name=analysis["name"],
            description=enhanced_description,
            github_user=analysis.get("github_user", "username"),
            project_preview=project_preview,
            features_list=features_list,
            technologies_section=technologies_section,
            quick_start_section=quick_start_section,
            file_structure=file_structure,
            structure_explanation=structure_explanation,
            installation_instructions=installation_instructions,
            usage_section=usage_section,
            configuration_section=configuration_section,
            api_documentation=api_documentation,
            testing_section=testing_section,
            deployment_section=deployment_section
        )
        
        return readme_content, analysis

    def _generate_structure_explanation(self, analysis: Dict) -> str:
        """
        Generate explanation for the project structure
        """
        explanations = []
        
        if analysis.get('main_files'):
            explanations.append("### 📁 Key Directories & Files\n")
            for file in analysis['main_files'][:5]:
                if file.endswith('.py'):
                    explanations.append(f"- `{file}` - Main Python application entry point")
                elif file.endswith('.js') or file.endswith('.ts'):
                    explanations.append(f"- `{file}` - Main JavaScript/TypeScript application")
                elif file.endswith('.html'):
                    explanations.append(f"- `{file}` - Main HTML entry point")
                else:
                    explanations.append(f"- `{file}` - Core application file")
        
        if analysis.get('test_files'):
            explanations.append(f"- `tests/` - Test suite with {len(analysis['test_files'])} test files")
        
        if analysis.get('config_files'):
            explanations.append("- `config/` - Configuration files and environment settings")
        
        return '\n'.join(explanations) if explanations else "Structure details available in the file tree above."

    def _generate_configuration_section(self, analysis: Dict) -> str:
        """
        Generate configuration section
        """
        if not analysis.get('config_files'):
            return "No special configuration required - the application works out of the box!"
        
        config_section = "### Environment Variables\n\n"
        config_section += "Create a `.env` file in the root directory:\n\n"
        config_section += "```env\n"
        config_section += "# Example configuration\n"
        config_section += "PORT=3000\n"
        config_section += "NODE_ENV=development\n"
        config_section += "DATABASE_URL=your_database_url\n"
        config_section += "API_KEY=your_api_key\n"
        config_section += "```\n\n"
        config_section += "### Available Configuration Files\n\n"
        
        for config_file in analysis['config_files'][:5]:
            config_section += f"- `{config_file}`\n"
        
        return config_section

    def _generate_api_docs_section(self, analysis: Dict) -> str:
        """
        Generate API documentation section for API projects
        """
        return """### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/health` | Health check |
| GET    | `/api/users` | Get all users |
| POST   | `/api/users` | Create new user |
| GET    | `/api/users/:id` | Get user by ID |
| PUT    | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Handling

```json
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```"""

    def _generate_deployment_section(self, analysis: Dict, project_type: str) -> str:
        """
        Generate deployment section
        """
        has_docker = any('docker' in f.lower() for f in analysis.get('config_files', []))
        
        deployment = ""
        
        if has_docker:
            deployment += """### 🐳 Docker Deployment

```bash
# Build the image
docker build -t """ + analysis['name'] + """ .

# Run the container
docker run -p 3000:3000 """ + analysis['name'] + """
```

### 🐳 Docker Compose

```bash
docker-compose up -d
```

"""
        
        if project_type == 'web_app':
            deployment += """### 🌐 Web Deployment

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

#### Heroku
```bash
git push heroku main
```
"""
        
        elif project_type == 'api':
            deployment += """### 🚀 API Deployment

#### Railway
```bash
railway login
railway init
railway up
```

#### DigitalOcean App Platform
- Connect your GitHub repository
- Set environment variables
- Deploy automatically
"""
        
        if not deployment:
            deployment = "Deployment instructions will be added based on your hosting preferences."
        
        return deployment
