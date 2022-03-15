export function loadProject(projectId: string) {
  const script = document.createElement('script');
  script.src = `${process.env.PROJECT_FILE}${projectId}.js`;
  document.head.appendChild(script);
}
