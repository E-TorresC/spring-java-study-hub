document.addEventListener('DOMContentLoaded', () => {
  const btnPremio = document.getElementById('btn-premio');
  const modal = document.getElementById('modal-premio');
  const btnCerrar = document.getElementById('btn-cerrar-premio');

  // Abrir modal
  btnPremio.addEventListener('click', () => {
    modal.classList.add('active');
  });

  // Cerrar modal con la X
  btnCerrar.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Cerrar modal haciendo clic fuera de la imagen (en el fondo oscuro)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Opcional: Cerrar modal con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });
});