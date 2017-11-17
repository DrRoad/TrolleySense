/**
 * @package     Joomla.Site
 * @subpackage  Templates.protostar
 * @copyright   Copyright (C) 2005 - 2014 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 * @since       3.2
 */

(function($)
{
	$(document).ready(function()
	{


		var esTouch = 'ontouchstart' in document.documentElement;
		if (esTouch==true){
			$(".menu_top li.parent").click(function(e){
				e.preventDefault();
				$('.menu_top li.parent ul').unbind("click");
				$(".menu_top li.parent ul.nav-child").fadeToggle(600);
			});
		}else{
			$(".menu_top li.parent").hoverIntent(function(){
				$('.menu_top li.parent ul').unbind("click");
				$(".menu_top li.parent ul.nav-child").fadeToggle(600);
			});

		}


		$('#form_descarga_folleto_home').submit(function(e) {
			e.preventDefault();


			var url = $(this).attr("action");
			var id  = $(this).attr("data-id");

			var fnombre 	= $('#' + id + '_form_nombre').val();
			var femail 		= $('#' + id + '_form_email').val();
			var fpais		= $('#' + id + '_form_pais').val();

			$('#form_descarga_folleto_home label i').remove();
			$('#form_descarga_folleto_home input').removeClass('resalta');

			if (fnombre.length <=3) {
				$('#' + id + '_form_nombre').addClass('resalta').focus();
				$('#label_' + id + '_nombre').prepend("<i class=\"fa fa-exclamation-triangle\" title='Campo Necesario'></i> ");
				return false;
				var errores=1;
			};	

			if (femail.length <=5 || (femail.indexOf('@')<1)) {
				$('#' + id + '_form_email').addClass('resalta').focus();
				$('#label_' + id + '_email').prepend("<i class=\"fa fa-exclamation-triangle\" title='Campo Necesario'></i> ");
				return false;
				var errores=1;
			};	

			if (fpais.length <=3) {
				$('#' + id + '_form_pais').addClass('resalta').focus();
				$('#label_' + id + '_pais').prepend("<i class=\"fa fa-exclamation-triangle\" title='Campo Necesario'></i> ");
				return false;
				var errores=1;
			};	

			if (errores!=1){
				$("#btn_id_" + id).fadeOut(500);
				$("#" + id + " .loading").show();
				$("#caja_resultado_" + id).animate({opacity:.3});

				var $form = $( this ),
				fmodule = $form.find( 'input[name="module_id"]' ).val();
				
				$("input", this).removeClass('resalta');
				
				$.post( url , {
					nombre:fnombre,
					email:femail,
					pais:fpais,
					module_id:fmodule,
					seccion:1
					},
					function(data){
					if (parseInt(data.respuesta)==1){
						$("#" + id + " .loading").hide();
						$("#" + id + " .texto").hide();
						$("#caja_resultado_" + id).animate({opacity:1});
						$("#" + id + " .box_campos").empty().append(data.texto_respuesta);
						$("#caja_buscamos_content").animate({height:200},500);
						ga('send', 'event', 'formulario', 'click', 'Baja_folleto');
					}else{
						$("#btn_id_" + id).show();
						$("#caja_resultado_" + id).animate({opacity:1});
						$("#" + id + " .loading").hide();
						alert(data.texto_respuesta);
					}
				},"json");

			}


		});	

		/*
		$(window).scroll(function() {
		    var height = $(window).scrollTop();

		    if(height  > 100) {
		        //alert(height);
		        $("#franja_imagen ul.nav").css("position",'fixed');
		        $("#franja_imagen ul.nav").css("top","0");
		    }else{
		        $("#franja_imagen ul.nav").css("position","relative");
		        $("#franja_imagen ul.nav").css("z-index","99999999");
		    }
		});
		*/

		$('*[rel=tooltip]').tooltip()

		// Turn radios into btn-group
		$('.radio.btn-group label').addClass('btn');
		$(".btn-group label:not(.active)").click(function()
		{
			var label = $(this);
			var input = $('#' + label.attr('for'));

			if (!input.prop('checked')) {
				label.closest('.btn-group').find("label").removeClass('active btn-success btn-danger btn-primary');
				if (input.val() == '') {
					label.addClass('active btn-primary');
				} else if (input.val() == 0) {
					label.addClass('active btn-danger');
				} else {
					label.addClass('active btn-success');
				}
				input.prop('checked', true);
			}
		});
		$(".btn-group input[checked=checked]").each(function()
		{
			if ($(this).val() == '') {
				$("label[for=" + $(this).attr('id') + "]").addClass('active btn-primary');
			} else if ($(this).val() == 0) {
				$("label[for=" + $(this).attr('id') + "]").addClass('active btn-danger');
			} else {
				$("label[for=" + $(this).attr('id') + "]").addClass('active btn-success');
			}
		});
	})
})(jQuery);