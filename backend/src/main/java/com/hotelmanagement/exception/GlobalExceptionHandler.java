package com.hotelmanagement.exception;

import com.hotelmanagement.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ==========================================
    // 400 - BAD REQUEST
    // ==========================================
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadRequest(BadRequestException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(e.getMessage(), null));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(e.getMessage(), null));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleUnreadableJson(HttpMessageNotReadableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail("Invalid JSON request body: Please verify request format and data types", null));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        String param = e.getName();
        String msg = String.format("Parameter '%s' has an invalid value format", param);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(msg, null));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Object>> handleMissingParam(MissingServletRequestParameterException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(String.format("Required parameter '%s' is missing", e.getParameterName()), null));
    }

    @ExceptionHandler({ MethodArgumentNotValidException.class, ConstraintViolationException.class })
    public ResponseEntity<ApiResponse<Object>> handleValidation(Exception e) {
        String msg = "Validation failed";
        if (e instanceof MethodArgumentNotValidException mane && mane.getBindingResult().getFieldError() != null) {
            msg = mane.getBindingResult().getFieldError().getDefaultMessage();
        } else if (e.getMessage() != null) {
            msg = e.getMessage();
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(msg, e.getMessage()));
    }

    // ==========================================
    // 401 - UNAUTHORIZED
    // ==========================================
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentials(BadCredentialsException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.fail(e.getMessage(), null));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> handleAuthException(AuthenticationException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.fail("Authentication required. Please login.", null));
    }

    // ==========================================
    // 402 - PAYMENT REQUIRED (SUBSCRIPTION EXPIRED)
    // ==========================================
    @ExceptionHandler(SubscriptionExpiredException.class)
    public ResponseEntity<ApiResponse<Object>> handleSubscriptionExpired(SubscriptionExpiredException e) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                .body(ApiResponse.fail(e.getMessage() != null ? e.getMessage() : "Your subscription or trial has expired. Please upgrade.", "SUBSCRIPTION_EXPIRED"));
    }

    // ==========================================
    // 403 - FORBIDDEN
    // ==========================================
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.fail("Access denied: You do not have permissions for this resource", null));
    }

    // ==========================================
    // 404 - NOT FOUND
    // ==========================================
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail(e.getMessage(), null));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNoResource(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Resource not found", e.getMessage()));
    }

    // ==========================================
    // 405 - METHOD NOT ALLOWED
    // ==========================================
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Object>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.fail(String.format("HTTP method '%s' is not supported for this endpoint", e.getMethod()), null));
    }

    // ==========================================
    // 409 - CONFLICT
    // ==========================================
    @ExceptionHandler({
        ConflictException.class,
        org.springframework.dao.DataIntegrityViolationException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleConflict(Exception e) {
        String msg = "A conflict occurred with an existing record.";
        if (e instanceof ConflictException ce) {
            msg = ce.getMessage();
        } else if (e.getMessage() != null) {
            String lower = e.getMessage().toLowerCase();
            if (lower.contains("table_number") || lower.contains("tablename") || lower.contains("table")) {
                msg = "A table with this number or name already exists in this branch.";
            } else if (lower.contains("order_number") || lower.contains("ordernumber")) {
                msg = "An order with this order number already exists.";
            } else if (lower.contains("duplicate entry")) {
                msg = "A record with this name or code already exists (Conflict).";
            }
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.fail(msg, "CONFLICT"));
    }

    // ==========================================
    // 501 - NOT IMPLEMENTED
    // ==========================================
    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotImplemented(UnsupportedOperationException e) {
        String msg = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : "This feature is not supported in the current version";
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(ApiResponse.fail(msg, null));
    }

    // ==========================================
    // 503 - SERVICE UNAVAILABLE (DATABASE / NETWORK DOWN)
    // ==========================================
    @ExceptionHandler({
        org.springframework.dao.DataAccessResourceFailureException.class,
        org.springframework.transaction.CannotCreateTransactionException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleServiceUnavailable(Exception e) {
        log.error("Database or service unavailable error: ", e);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiResponse.fail("Service is temporarily unavailable. Database connection is reconnecting. Please retry shortly.", null));
    }

    // ==========================================
    // 500 - INTERNAL SERVER ERROR
    // ==========================================
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneric(Exception e) {
        log.error("Unhandled server exception: ", e);
        String msg = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : "An unexpected server error occurred";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.fail(msg, null));
    }
}
