$(document).ready(function() {
    
    // Attach a click event listener to delete-btn
    $('#delete-btn').on('click', function(e) {
        console.log('delete clicked');
        
        const itemId = $(this).data('item-id');
        const url = `/${itemId}`;
        
        if (!confirm(`Are you sure you want to delete this entry?`)) {
            return; 
        }

        $.ajax({
            url: url,
            type: 'DELETE', 
            dataType: 'text', 
            
            success: function(response) {
                console.log(`Success`);
                window.location.href = "/";
            },
            
            error: function(xhr, status, error) {
                console.error(`Deletion Failed (Status ${xhr.status})`);
            }
        });
    });
});