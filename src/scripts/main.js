main();

var editing = false;

function main() {
	setupMenuBarDate();
	initializeAdministered();
	setupUserInterfaceActions();
	setupUpdateIconActions();
}

function setupMenuBarDate() {
	var currentDay = moment().format('dddd');
	var currentDate = moment().format('MMMM D, YYYY');
	$('#date').html('<span class="teal-text">' + currentDay + '</span> ' + currentDate);
}

function setupUpdateIconActions() {
	$('#edit').click(editClick);
	$('#save').click(saveClick);
	$('#cancel').click(cancelClick);
}

function editClick() {
	startEdit();
}

function cancelClick() {
	cancelEdit();
}

function saveClick() {
	$('.timepicker')
		.filter(function() {
			return !!this.value;
		})
		.each(function() {
			var checkbox = $(this)
				.siblings('label')
				.children(':checkbox');
			var patient = checkbox.attr('id').split('-')[0];
			var scheduledTime = checkbox.val();
			var currentDate = moment().format('M/DD/YYYY');
			var updatedAdministeredTime = moment($(this).val(), 'hh:mm a').format('h:mma');
			updateMedicineGiven(patient, scheduledTime, currentDate, updatedAdministeredTime, function(data) {
				checkbox
					.parent()
					.siblings('.actual-time')
					.html(updatedAdministeredTime);
			});
		});
	cancelEdit();
}

function startEdit() {
	editing = true;
	$('.edit-tools')
		.animateCss('slideInRight')
		.css('display', 'inline-block');
	$('#edit').addClass('teal-text no-hover-pointer');
	$('.actual-time:not(:empty)')
		.siblings('.timepicker')
		.each(function() {
			$(this).timepicker({
				container: '.timepicker-container',
				defaultTime: moment(
					$(this)
						.siblings('.actual-time')
						.text(),
					'h:mma'
				).format('HH:mm'),
				onSelect: timeSelected
				// onSelect: function (hour, minute) {
				// 	var updatedAdministeredTime = moment(hour + ':' + minute, 'HH:mm').format('h:mma');
				// 	$(this).siblings('.actual-time').text(updatedAdministeredTime).addClass('teal-text');
				// }
			});
		});
	$('.actual-time:empty')
		.siblings('label')
		.children(':checkbox')
		.prop('disabled', true);
	$('.actual-time:not(:empty)')
		.siblings('label')
		.children(':checkbox')
		.prop('disabled', false);
	$('.actual-time:not(:empty)')
		.siblings('.edit-time')
		.animateCss('fadeIn')
		.show()
		.click(function() {
			$(this)
				.siblings('.timepicker')
				.timepicker('open');
		});
}

function timeSelected() {
	console.log('time selected!');
}

function cancelEdit() {
	editing = false;
	var editTools = $('.edit-tools');
	editTools.animateCss('slideOutRight', function() {
		editTools.hide();
	});
	$('#edit').removeClass('teal-text no-hover-pointer');
	$('.actual-time:empty')
		.siblings('label')
		.children(':checkbox')
		.prop('disabled', false);
	$('.actual-time:not(:empty)')
		.siblings('label')
		.children(':checkbox')
		.prop('disabled', true);
	$('.timepicker')
		.hide()
		.val('');
	var buttons = $('.actual-time:not(:empty)').siblings('.edit-time');
	buttons.animateCss('fadeOut', function() {
		buttons.hide();
	});
}

function initializeAdministered() {
	var currentDate = moment().format('M/DD/YYYY');
	fetch('http://localhost:4000/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: `{
				administrations(date: "${currentDate}") {
					poodle
					date
					scheduledTime
					administeredTime
				}
			}`
		})
	})
		.then(res => res.json())
		.then(res => {
			var administered = res.data.administrations;
			for (var i = 0, length = administered.length; i < length; i++) {
				var entry = administered[i];
				// id contains patient name and value is the scheduled time
				$(':checkbox[id*="' + entry.poodle + '"][value="' + entry.scheduledTime + '"]')
					.prop('checked', true)
					.prop('disabled', true)
					.parent('label')
					.siblings('.actual-time')
					.html(entry.administeredTime);
			}
		});
}

function setupUserInterfaceActions() {
	// confirm modal
	$('#confirm').modal();

	// checkboxes
	$(':checkbox').change(function() {
		if (this.checked) {
			// checkbox was checked
			checked($(this));
		} else {
			// checkbox was unchecked
			unchecked($(this));
		}
	});
}

function checked(checkbox) {
	var patient = checkbox.attr('id').split('-')[0];
	var scheduledTime = checkbox.val();

	// confirmMedicineGiven(patient, scheduledTime, checkbox, function() {
	var currentDate = moment().format('M/DD/YYYY');
	var currentTime = moment().format('h:mma');
	medicineGiven(patient, scheduledTime, currentDate, currentTime, function(data) {
		checkbox
			.parent()
			.siblings('.actual-time')
			.html(currentTime);
		editing &&
			checkbox
				.parent()
				.siblings('.edit-time')
				.animateCss('fadeIn')
				.show();
	});
	// });
}

function unchecked(checkbox) {
	var patient = checkbox.attr('id').split('-')[0];
	var currentDate = moment().format('M/DD/YYYY');
	var scheduledTime = checkbox.val();
	removeMedicineGiven(patient, currentDate, scheduledTime, function(success) {
		if (success) {
			checkbox.prop('checked', false);
			checkbox
				.parent()
				.siblings('.actual-time')
				.empty();
			editing &&
				checkbox
					.parent()
					.siblings('.edit-time')
					.animateCss('fadeOut', function() {
						checkbox
							.parent()
							.siblings('.edit-time')
							.hide();
					});
		}
	});
}

// function confirmMedicineGiven(patient, scheduledTime, checkbox, callback) {
// 	var confirmText = patient.charAt(0).toUpperCase() + patient.slice(1) + ' just got ' + (patient === 'chiana' ? 'her ' : 'his ') + scheduledTime + ' pill.';
// 	$('#confirm .body').text(confirmText);
// 	$('.confirm-no')
// 		.off('click')
// 		.on('click', function() {
// 			checkbox.prop('checked', false);
// 		});
// 	$('.confirm-yes')
// 		.off('click')
// 		.on('click', function() {
// 			callback();
// 		});
// 	$('#confirm').modal('open');
// }

function medicineGiven(patient, scheduledTime, date, time, callback) {
	fetch('http://localhost:4000/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: `mutation ($poodle: String, $date: String, $scheduledTime: String, $administeredTime: String) {
				addAdministration (
					poodle: $poodle,
					date: $date,
					scheduledTime: $scheduledTime,
					administeredTime: $administeredTime
				) {
					success
					message
					administration {
						id
						poodle
						date
						scheduledTime
						administeredTime
					}
				}
			}`,
			variables: {
				poodle: patient,
				date: date,
				scheduledTime: scheduledTime,
				administeredTime: time
			}
		})
	})
		.then(res => res.json())
		.catch(err => console.error(err))
		.then(res => {
			console.log(res);
			callback && callback(res.data);
		});

	// $.post('http://poodles.vanessaroycroft.com/server/databaseInterface.php?action=save', dataToStore, function(data) {
	// 	callback && callback(data);
	// });
}

function updateMedicineGiven(patient, scheduledTime, date, time, callback) {
	fetch('http://localhost:4000/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: `mutation ($poodle: String, $date: String, $scheduledTime: String, $administeredTime: String) {
				updateAdministration (
					poodle: $poodle,
					date: $date,
					scheduledTime: $scheduledTime,
					administeredTime: $administeredTime
				) {
					success
					message
					updatedCount
				}
			}`,
			variables: {
				poodle: patient,
				date: date,
				scheduledTime: scheduledTime,
				administeredTime: time
			}
		})
	})
		.then(res => res.json())
		.catch(err => console.error(err))
		.then(res => {
			callback && callback(res.data);
		});
}

function removeMedicineGiven(patient, date, scheduledTime, callback) {
	// var dataToRemove = {
	// 	patient: patient,
	// 	date: date,
	// 	scheduledTime: scheduledTime
	// };

	fetch('http://192.168.1.253:4000/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: `mutation ($poodle: String, $date: String, $scheduledTime: String) {
				removeAdministration (
					poodle: $poodle,
					date: $date,
					scheduledTime: $scheduledTime,
				) {
					success
					message
					deletedCount
				}
			}`,
			variables: {
				poodle: patient,
				date: date,
				scheduledTime: scheduledTime
			}
		})
	})
		.then(res => res.json())
		.catch(err => console.error(err))
		.then(res => {
			callback && callback(res.data);
		});

	// $.post('http://poodles.vanessaroycroft.com/server/databaseInterface.php?action=remove', dataToRemove, function(success) {
	// 	callback && callback(success);
	// });
}

$.fn.extend({
	animateCss: function(animationName, callback) {
		var animationEnd = (function(el) {
			var animations = {
				animation: 'animationend',
				OAnimation: 'oAnimationEnd',
				MozAnimation: 'mozAnimationEnd',
				WebkitAnimation: 'webkitAnimationEnd'
			};

			for (var t in animations) {
				if (el.style[t] !== undefined) {
					return animations[t];
				}
			}
		})(document.createElement('div'));

		this.addClass(animationName).one(animationEnd, function() {
			$(this).removeClass(animationName);
			if (typeof callback === 'function') callback();
		});

		return this;
	}
});
