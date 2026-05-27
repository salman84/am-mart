export default function Custom500() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 8 }}>500</h1>
      <p style={{ color: '#666' }}>Something went wrong</p>
    </div>
  );
}
