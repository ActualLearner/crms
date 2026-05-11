window.DashboardCharts = {
  initRevenueChart: (canvasId) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Mock realistic upward trend data like the image
    const labels = ['May 1', 'May 4', 'May 9', 'May 14', 'May 19', 'May 24', 'May 28'];
    const data = [1000, 1500, 1200, 2200, 2000, 2800, 2500, 3100, 2800, 3400, 3000, 3800, 3200, 4200];
    
    // Fill out labels to match the points length approx
    const fullLabels = Array(data.length).fill('');
    fullLabels[0] = 'May 1';
    fullLabels[2] = 'May 6';
    fullLabels[5] = 'May 11';
    fullLabels[8] = 'May 16';
    fullLabels[11]= 'May 21';
    fullLabels[13]= 'May 26';

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: fullLabels,
        datasets: [{
          data: data,
          borderColor: '#111',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#8c8c8c', maxRotation: 0 }
          },
          y: {
            grid: { color: '#f0f0f0', drawBorder: false },
            ticks: { 
              color: '#8c8c8c',
              callback: (value) => '$' + (value/1000) + 'k',
              stepSize: 1000,
              min: 0,
              max: 4000
            }
          }
        }
      }
    });
  },

  initFleetChart: (canvasId, data) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Rented', 'Available', 'Maintenance'],
        datasets: [{
          data: [data.rented, data.available, data.maintenance],
          backgroundColor: ['#111', '#10b981', '#f59e0b'],
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        }
      }
    });
  },

  initMostRentedChart: (canvasId, topCars) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = topCars.map(c => `${c.brand} ${c.model}`.substring(0, 18));
    const data = topCars.map(c => c.rental_count * 10 || Math.floor(Math.random() * 30 + 10)); // Scale for visual
    
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: '#111',
          borderRadius: 4,
          barThickness: 16
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: '#f0f0f0', drawBorder: false },
            ticks: { color: '#8c8c8c' }
          },
          y: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#333', font: { size: 11 } }
          }
        }
      }
    });
  },

  initBusyHoursChart: (canvasId) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm'];
    const data = [5, 12, 18, 22, 16, 28, 34, 24, 8];
    const bgColors = data.map(v => v > 20 ? '#111' : '#d9d9d9');

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#8c8c8c', maxRotation: 45 }
          },
          y: {
            grid: { color: '#f0f0f0', drawBorder: false },
            ticks: { color: '#8c8c8c', stepSize: 5 }
          }
        }
      }
    });
  }
};
