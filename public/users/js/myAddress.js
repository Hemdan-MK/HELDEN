document.addEventListener('DOMContentLoaded', () => {
	const modal = document.getElementById('addressModal');
	const addressForm = document.getElementById('addressForm');

	// Open Modal
	window.openModal = () => {
		modal.style.display = 'block';
	};

	// Close Modal
	window.closeModal = () => {
		modal.style.display = 'none';
	};

	// Form Submission
	addressForm.addEventListener('submit', (e) => {
		e.preventDefault();

		// Collect form data
		const data = {
			houseName: document.getElementById('houseName').value,
			country: document.getElementById('country').value,
			state: document.getElementById('state').value,
			city: document.getElementById('city').value,
			district: document.getElementById('district').value,
			pincode: document.getElementById('pincode').value,
		};

		// Add basic validation or additional checks
		if (!data.houseName || !data.pincode) {
			Swal.fire('Error', 'Please fill out all required fields.', 'error');
			return;
		}

		// Simulate server submission
		fetch('/addAddress', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		})
			.then((res) => res.json())
			.then((response) => {
				if (response.success) {
					Swal.fire('Success', 'Address added successfully.', 'success').then(() => {
						window.location.reload(); // Refresh to show updated addresses
					});
				} else {
					throw new Error(response.message);
				}
			})
			.catch((err) => {
				console.error(err);
				Swal.fire('Error', 'Failed to add address.', 'error');
			});
	});
});
